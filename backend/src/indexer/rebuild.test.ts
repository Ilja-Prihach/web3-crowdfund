import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { parseEther } from "viem";

import { createChainClient } from "../chain/client.ts";
import { campaignMetadata, campaigns, chainEvents, contributions } from "../db/schema.ts";
import { anvilAccounts, useAnvil } from "../test/anvil.ts";
import { deployCrowdfunding } from "../test/crowdfunding.ts";
import { createTestDatabase, resetTestDatabase } from "../test/database.ts";
import { indexNextBatch } from "./batch.ts";
import { rebuildProjections } from "./rebuild.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

const [creator, donor] = anvilAccounts;

// Две кампании с вкладами, возвратом и выводом — всё уже финализировано.
const stand = useAnvil(async ({ client }) => {
  const campaign = await deployCrowdfunding(client, creator);
  const contract = { chainId: await client.getChainId(), address: campaign.address, deployBlock: await client.getBlockNumber({ cacheTime: 0 }) };
  const cancelled = await campaign.createCampaign(creator, { goal: parseEther("1") });
  await campaign.donate(donor, cancelled.campaignId, parseEther("0.3"));
  await campaign.cancel(creator, cancelled.campaignId);
  await campaign.refund(donor, cancelled.campaignId);
  const funded = await campaign.createCampaign(creator, { goal: parseEther("0.5"), mode: "open" });
  await campaign.donate(donor, funded.campaignId, parseEther("0.2"));
  await campaign.donate(creator, funded.campaignId, parseEther("0.3"));
  await campaign.withdraw(creator, funded.campaignId);
  await client.mine({ blocks: 64 });
  return { contract };
});

const deps = () => ({ db, chain: createChainClient(stand.anvil.url), contract: stand.context.contract });

async function indexUntilIdle() {
  while ((await indexNextBatch({ ...deps(), batchSize: 3n })).status === "indexed");
}

// Снимок проекций в стабильном порядке — для сравнения «до» и «после».
async function snapshot() {
  const order = (left: { campaignId: bigint }, right: { campaignId: bigint }) => Number(left.campaignId - right.campaignId);
  return {
    campaigns: (await db.select().from(campaigns)).toSorted(order),
    contributions: (await db.select().from(contributions)).toSorted(
      (left, right) => order(left, right) || left.donor.localeCompare(right.donor),
    ),
  };
}

describe("rebuildProjections", () => {
  it("восстанавливает удалённые и испорченные проекции точно такими, какими их построил indexer", async () => {
    await indexUntilIdle();
    const built = await snapshot();
    assert.equal(built.campaigns.length, 2);

    await db.update(campaigns).set({ totalRaised: 999n });
    await db.delete(contributions);
    const result = await rebuildProjections(deps());

    assert.deepEqual(result, { events: 8, fetchedMetadata: 0, fetchedBlockTimes: 0 });
    assert.deepEqual(await snapshot(), built);
  });

  it("дочитывает из сети метаданные событий, записанных до появления проекций", async () => {
    await indexUntilIdle();
    const built = await snapshot();
    // Как база до миграции 0002: журнал есть, проекций и метаданных нет.
    await db.delete(campaigns);
    await db.delete(campaignMetadata);

    const result = await rebuildProjections(deps());

    assert.deepEqual(result, { events: 8, fetchedMetadata: 2, fetchedBlockTimes: 0 });
    assert.deepEqual(await snapshot(), built);
    assert.equal(await db.$count(campaignMetadata), 2);
  });

  it("дочитывает время блока у событий, записанных до миграции 0003", async () => {
    await indexUntilIdle();
    const timed = await db.select().from(chainEvents);
    await db.update(chainEvents).set({ blockTimestamp: null });

    const result = await rebuildProjections(deps());

    // Восемь событий лежат в восьми разных блоках: Anvil майнит блок на каждую транзакцию.
    assert.equal(result.fetchedBlockTimes, 8);
    assert.deepEqual(await db.select().from(chainEvents), timed);
  });

  it("не меняет журнал событий", async () => {
    await indexUntilIdle();
    const journal = await db.select().from(chainEvents);

    await rebuildProjections(deps());

    assert.deepEqual(await db.select().from(chainEvents), journal);
    assert.ok(journal.every((row) => row.blockTimestamp instanceof Date), "indexer сразу пишет время блока");
  });

  it("одновременно с indexer даёт ту же проекцию, что и пересборка в тишине", async () => {
    await Promise.all([indexUntilIdle(), rebuildProjections(deps()), rebuildProjections(deps())]);
    const concurrent = await snapshot();

    await rebuildProjections(deps());

    assert.equal(await db.$count(chainEvents), 8);
    assert.deepEqual(concurrent, await snapshot());
  });
});
