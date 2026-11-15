import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";
import { parseEther } from "viem";

import { createChainClient } from "../chain/client.ts";
import { campaignMetadata, campaigns, contributions } from "../db/schema.ts";
import { anvilAccounts, useAnvil } from "../test/anvil.ts";
import { deployCrowdfunding } from "../test/crowdfunding.ts";
import { createTestDatabase, resetTestDatabase } from "../test/database.ts";
import { indexNextBatch } from "./batch.ts";
import { createReconciler, type ReconcileResult, reconcileProjections } from "./reconcile.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

const [creator, donor] = anvilAccounts;

const stand = useAnvil(async ({ client }) => {
  const campaign = await deployCrowdfunding(client, creator);
  const contract = { chainId: await client.getChainId(), address: campaign.address, deployBlock: await client.getBlockNumber({ cacheTime: 0 }) };
  const first = await campaign.createCampaign(creator, { goal: parseEther("1"), title: "Первая" });
  await campaign.donate(donor, first.campaignId, parseEther("0.3"));
  const second = await campaign.createCampaign(creator, { goal: parseEther("0.5"), mode: "open" });
  await campaign.donate(donor, second.campaignId, parseEther("0.5"));
  await campaign.withdraw(creator, second.campaignId);
  await client.mine({ blocks: 64 });
  return { campaign, contract };
});

const deps = () => ({ db, chain: createChainClient(stand.anvil.url), contract: stand.context.contract });

async function indexUntilIdle() {
  while ((await indexNextBatch({ ...deps(), batchSize: 1_000n })).status === "indexed");
}

const byCampaign = (campaignId: bigint) => eq(campaigns.campaignId, campaignId);

describe("reconcileProjections", () => {
  it("молчит, когда проекции совпадают с контрактом", async () => {
    await indexUntilIdle();

    const result = await reconcileProjections(deps());

    assert.equal(result?.campaigns, 2);
    assert.deepEqual(result?.mismatches, []);
  });

  it("сверяет на блоке checkpoint: новые, ещё не прочитанные события не считаются расхождением", async () => {
    await indexUntilIdle();
    // Кампания и вклад после checkpoint: в проекции их ещё нет, и это не ошибка.
    const { campaign } = stand.context;
    const late = await campaign.createCampaign(creator, { goal: parseEther("1") });
    await campaign.donate(donor, 0n, parseEther("0.1"));

    const result = await reconcileProjections(deps());

    assert.ok(late.campaignId === 2n);
    assert.equal(result?.campaigns, 2);
    assert.deepEqual(result?.mismatches, []);
  });

  it("называет кампанию и поле расхождения: сумму, флаг, название и потерянный вклад", async () => {
    await indexUntilIdle();
    await db.update(campaigns).set({ totalRaised: parseEther("0.2") }).where(byCampaign(0n));
    await db.update(campaigns).set({ fundsWithdrawn: false }).where(byCampaign(1n));
    await db.update(campaignMetadata).set({ title: "Подмена" }).where(eq(campaignMetadata.campaignId, 0n));
    await db.delete(contributions).where(eq(contributions.campaignId, 1n));

    const result = await reconcileProjections(deps());

    assert.deepEqual(
      result?.mismatches.map(({ campaignId, field }) => `${campaignId}.${field}`),
      ["0.totalRaised", "0.title", "1.fundsWithdrawn", "0.sum(contributions)", "1.sum(contributions)"],
    );
    assert.deepEqual(result?.mismatches[0], {
      campaignId: "0",
      field: "totalRaised",
      projection: parseEther("0.2").toString(),
      contract: parseEther("0.3").toString(),
    });
  });

  it("замечает потерянную кампанию и лишнюю кампанию", async () => {
    await indexUntilIdle();
    const key = { chainId: stand.context.contract.chainId, contractAddress: stand.context.contract.address.toLowerCase() };
    await db.delete(campaigns).where(byCampaign(1n));
    // Кампании 5 в контракте нет, а в базе есть — например, из журнала чужой сети.
    await db.insert(campaignMetadata).values({ ...key, campaignId: 5n, fundingMode: "open_ended", title: "x", description: "x" });
    await db.insert(campaigns).values({
      ...key,
      campaignId: 5n,
      creator: creator.address.toLowerCase(),
      goal: 1n,
      deadline: 0n,
      totalRaised: 0n,
      cancelled: false,
      fundsWithdrawn: false,
      createdBlock: 1n,
      updatedBlock: 1n,
    });

    const result = await reconcileProjections(deps());

    assert.deepEqual(result?.mismatches, [
      { campaignId: "1", field: "exists", projection: "false", contract: "true" },
      { campaignId: "5", field: "exists", projection: "true", contract: "false" },
    ]);
  });

  it("без checkpoint ничего не сверяет", async () => {
    assert.equal(await reconcileProjections(deps()), null);
  });
});

describe("createReconciler", () => {
  const ok: ReconcileResult = { checkedBlock: 10n, campaigns: 2, mismatches: [] };

  function setup(results: (ReconcileResult | Error)[]) {
    let clock = 0;
    const calls: number[] = [];
    const logs: { level: string; message: string; fields: object }[] = [];
    const push = (level: string) => (fields: object, message: string) => void logs.push({ level, message, fields });
    const reconcile = createReconciler({
      reconcile: () => {
        calls.push(clock);
        const next = results.shift() ?? ok;
        return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
      },
      log: { info: push("info"), warn: push("warn"), error: push("error") },
      intervalMs: 1_000,
      now: () => clock,
    });
    return { reconcile, calls, logs, tick: (ms: number) => void (clock += ms) };
  }

  it("сверяет при первом простое и затем не чаще интервала", async () => {
    const { reconcile, calls, tick } = setup([]);

    await reconcile();
    tick(500);
    await reconcile();
    tick(500);
    await reconcile();

    assert.deepEqual(calls, [0, 1_000]);
  });

  it("сбой сети — предупреждение и повтор при следующем простое, а не через час", async () => {
    const { reconcile, calls, logs, tick } = setup([new Error("network down")]);

    await reconcile();
    tick(10);
    await reconcile();

    assert.deepEqual(calls, [0, 10]);
    assert.deepEqual(
      logs.map((entry) => entry.level),
      ["warn", "info"],
    );
  });

  it("расхождение — ошибка в логе со списком, не больше 20 строк", async () => {
    const mismatches = Array.from({ length: 25 }, (_, index) => ({
      campaignId: String(index),
      field: "exists",
      projection: "false",
      contract: "true",
    }));
    const { reconcile, logs } = setup([{ ...ok, mismatches }]);

    await reconcile();

    assert.equal(logs[0]?.level, "error");
    assert.match(logs[0]?.message ?? "", /indexer:rebuild/);
    assert.equal((logs[0]?.fields as { mismatchCount: number }).mismatchCount, 25);
    assert.equal((logs[0]?.fields as { mismatches: unknown[] }).mismatches.length, 20);
  });
});
