import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { parseEther } from "viem";

import { campaignMetadata, campaigns, contributions } from "../db/schema.ts";
import { createTestDatabase, resetTestDatabase } from "../test/database.ts";
import type { IndexedContract } from "./events.ts";
import { applyEvents, type ProjectedEvent } from "./projection.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(async () => {
  await resetTestDatabase(db);
  // Метаданные indexer дочитывает до применения событий; здесь они готовы заранее.
  await db.insert(campaignMetadata).values(
    [0n, 1n].map((campaignId) => ({
      chainId: contract.chainId,
      contractAddress: contract.address.toLowerCase(),
      campaignId,
      fundingMode: "fixed_deadline" as const,
      title: `Кампания ${campaignId}`,
      description: "Описание",
    })),
  );
});

const contract: IndexedContract = {
  chainId: 31_337,
  address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  deployBlock: 1n,
};
const creator = "0x480ec361ebdd78465831eb555d3efcf650d2a217";
const alice = "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5";
const bob = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

// Синтетическая строка журнала: позиция в сети, событие и его аргументы строками, как в chain_events.
const at = (blockNumber: bigint, logIndex: number) => ({
  created: (campaignId: bigint, goal: bigint, deadline = 1_800_000_000n): ProjectedEvent => ({
    blockNumber,
    logIndex,
    eventName: "CampaignCreated",
    campaignId,
    args: { creator, goal: goal.toString(), deadline: deadline.toString() },
  }),
  event: (eventName: string, campaignId: bigint, args: Record<string, string | bigint> = {}): ProjectedEvent => ({
    blockNumber,
    logIndex,
    eventName,
    campaignId,
    args: Object.fromEntries(Object.entries(args).map(([name, value]) => [name, value.toString()])),
  }),
});

async function campaign(campaignId: bigint) {
  const rows = await db.select().from(campaigns);
  return rows.find((row) => row.campaignId === campaignId);
}

async function contributionOf(donor: string) {
  const rows = await db.select().from(contributions);
  return rows.find((row) => row.donor === donor)?.amount;
}

describe("applyEvents", () => {
  it("создание, смена срока, вклады и возврат дают состояние, как в контракте", async () => {
    await applyEvents(db, contract, [
      at(10n, 0).created(0n, parseEther("1")),
      at(11n, 0).event("CampaignDeadlineUpdated", 0n, { previousDeadline: 1_800_000_000n, newDeadline: 1_900_000_000n }),
      at(12n, 0).event("DonationMade", 0n, { donor: alice, amount: parseEther("0.2") }),
      at(12n, 1).event("DonationMade", 0n, { donor: bob, amount: parseEther("0.1") }),
      at(13n, 0).event("DonationMade", 0n, { donor: alice, amount: parseEther("0.3") }),
      at(14n, 0).event("RefundClaimed", 0n, { donor: bob, amount: parseEther("0.1") }),
    ]);

    const row = await campaign(0n);
    assert.equal(row?.creator, creator);
    assert.equal(row?.goal, parseEther("1"));
    assert.equal(row?.deadline, 1_900_000_000n);
    assert.equal(row?.totalRaised, parseEther("0.5"));
    assert.equal(row?.createdBlock, 10n);
    assert.equal(row?.updatedBlock, 14n);
    assert.equal(await contributionOf(alice), parseEther("0.5"), "два вклада складываются");
    assert.equal(await contributionOf(bob), 0n, "после возврата вклад обнуляется, как в контракте");
  });

  it("отмена и вывод ставят флаги, не трогая суммы", async () => {
    await applyEvents(db, contract, [
      at(10n, 0).created(0n, parseEther("1")),
      at(10n, 1).created(1n, parseEther("0.5"), 0n),
      at(11n, 0).event("CampaignCancelled", 0n, { creator }),
      at(12n, 0).event("DonationMade", 1n, { donor: alice, amount: parseEther("0.5") }),
      at(13n, 0).event("FundsWithdrawn", 1n, { creator, amount: parseEther("0.5") }),
    ]);

    assert.equal((await campaign(0n))?.cancelled, true);
    assert.equal((await campaign(0n))?.fundsWithdrawn, false);
    const withdrawn = await campaign(1n);
    assert.equal(withdrawn?.fundsWithdrawn, true);
    assert.equal(withdrawn?.deadline, 0n, "сбор без срока");
    // totalRaised после вывода в контракте не обнуляется — проекция тоже.
    assert.equal(withdrawn?.totalRaised, parseEther("0.5"));
  });

  it("применяет события по блоку и номеру лога, а не по порядку в массиве", async () => {
    await applyEvents(db, contract, [
      at(12n, 0).event("RefundClaimed", 0n, { donor: alice, amount: parseEther("0.2") }),
      at(11n, 3).event("DonationMade", 0n, { donor: alice, amount: parseEther("0.2") }),
      at(10n, 0).created(0n, parseEther("1")),
    ]);

    assert.equal((await campaign(0n))?.totalRaised, 0n);
  });

  it("отклоняет событие для неизвестной кампании, возврат без вклада и сверх вклада", async () => {
    await assert.rejects(
      applyEvents(db, contract, [at(10n, 0).event("DonationMade", 0n, { donor: alice, amount: 1n })]),
      /DonationMade for campaign 0 at block 10: campaign is not in the projection/,
    );

    await applyEvents(db, contract, [
      at(10n, 0).created(0n, parseEther("1")),
      at(11n, 0).event("DonationMade", 0n, { donor: alice, amount: 5n }),
    ]);
    await assert.rejects(
      applyEvents(db, contract, [at(12n, 0).event("RefundClaimed", 0n, { donor: bob, amount: 0n })]),
      /refund without a contribution/,
    );
    // CHECK базы: сумма кампании ушла бы в минус.
    await assert.rejects(applyEvents(db, contract, [at(12n, 0).event("RefundClaimed", 0n, { donor: alice, amount: 6n })]));
  });

  it("не создаёт кампанию дважды и без метаданных", async () => {
    await applyEvents(db, contract, [at(10n, 0).created(0n, 1n)]);
    await assert.rejects(applyEvents(db, contract, [at(11n, 0).created(0n, 1n)]), "первичный ключ");
    await assert.rejects(applyEvents(db, contract, [at(11n, 0).created(2n, 1n)]), "внешний ключ на метаданные");
  });

  it("отклоняет неизвестное событие и событие без нужного аргумента", async () => {
    await applyEvents(db, contract, [at(10n, 0).created(0n, 1n)]);
    await assert.rejects(applyEvents(db, contract, [at(11n, 0).event("Transfer", 0n)]), /unknown event/);
    await assert.rejects(
      applyEvents(db, contract, [at(11n, 0).event("DonationMade", 0n, { donor: alice })]),
      /missing argument amount/,
    );
  });
});
