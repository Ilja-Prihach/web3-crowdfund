import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { parseEther } from "viem";

import { campaignMetadata, chainEvents, contributions, indexerCheckpoints } from "../../db/schema.ts";
import type { ChainEventRow, IndexedContract } from "../../indexer/events.ts";
import { applyEvents } from "../../indexer/projection.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";
import { type EventPosition, listActivity, listDonors } from "./activity.ts";
import { listCampaigns } from "./repository.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());

const contract: IndexedContract = { chainId: 11_155_111, address: "0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A", deployBlock: 1n };
const key = { chainId: contract.chainId, contractAddress: contract.address.toLowerCase() };
const creator = "0x480ec361ebdd78465831eb555d3efcf650d2a217";
const alice = "0xa11ce00000000000000000000000000000000001";
const bob = "0xb0b0000000000000000000000000000000000002";
const carol = "0xca10100000000000000000000000000000000003";
const dave = "0xda7e000000000000000000000000000000000004";

let txCounter = 0;
// Строка журнала: блок N получает время 1 800 000 000 + N·12 секунд, как в сети с блоком раз в 12 секунд.
function event(blockNumber: bigint, logIndex: number, eventName: string, campaignId: bigint, args: Record<string, string | bigint>): ChainEventRow {
  txCounter += 1;
  return {
    ...key,
    blockNumber,
    blockTimestamp: new Date((1_800_000_000 + Number(blockNumber) * 12) * 1000),
    txHash: `0x${txCounter.toString(16).padStart(64, "0")}`,
    logIndex,
    eventName,
    campaignId,
    args: Object.fromEntries(Object.entries(args).map(([name, value]) => [name, value.toString()])),
  };
}

const journal = () => [
  event(10n, 0, "CampaignCreated", 0n, { creator, goal: parseEther("2"), deadline: 1_900_000_000n }),
  event(11n, 0, "CampaignDeadlineUpdated", 0n, { previousDeadline: 1_900_000_000n, newDeadline: 1_950_000_000n }),
  event(12n, 0, "DonationMade", 0n, { donor: alice, amount: parseEther("0.2") }),
  event(12n, 1, "DonationMade", 0n, { donor: bob, amount: parseEther("0.1") }),
  event(13n, 0, "DonationMade", 0n, { donor: alice, amount: parseEther("0.3") }),
  event(14n, 0, "RefundClaimed", 0n, { donor: bob, amount: parseEther("0.1") }),
  event(15n, 0, "DonationMade", 0n, { donor: dave, amount: parseEther("0.3") }),
  event(16n, 0, "DonationMade", 0n, { donor: carol, amount: parseEther("0.3") }),
  // Чужая кампания: её события в ленту кампании 0 не попадают.
  event(17n, 0, "CampaignCreated", 1n, { creator, goal: parseEther("1"), deadline: 0n }),
  event(18n, 0, "CampaignCancelled", 1n, { creator }),
];

// Журнал и проекции — как после работы indexer: та же applyEvents.
beforeEach(async () => {
  await resetTestDatabase(db);
  await db.insert(campaignMetadata).values([
    { ...key, campaignId: 0n, fundingMode: "fixed_deadline", title: "Лекторий", description: "Сбор на зал" },
    { ...key, campaignId: 1n, fundingMode: "open_ended", title: "Без срока", description: "Отменённый сбор" },
  ]);
  const rows = journal();
  await db.insert(chainEvents).values(rows);
  await applyEvents(db, contract, rows);
  await db.insert(indexerCheckpoints).values({ ...key, lastBlock: 20n });
});

describe("listActivity", () => {
  it("отдаёт события кампании от новых к старым: кто, сколько, срок и время блока", async () => {
    const result = await listActivity(db, contract, 0n, { limit: 50 });

    assert.deepEqual(
      result?.items.map((item) => `${item.type}:${item.blockNumber}.${item.logIndex}`),
      ["donation:16.0", "donation:15.0", "refund:14.0", "donation:13.0", "donation:12.1", "donation:12.0", "deadline_updated:11.0", "created:10.0"],
    );
    const refund = result?.items[2];
    assert.equal(refund?.actor, bob);
    assert.equal(refund?.amount, parseEther("0.1"));
    assert.deepEqual(refund?.blockTimestamp, new Date((1_800_000_000 + 14 * 12) * 1000));
    assert.equal(result?.items[6]?.deadline, 1_950_000_000n, "новый срок");
    assert.equal(result?.items[7]?.actor, creator);
    assert.equal(result?.items[7]?.amount, null, "у создания нет суммы");
    assert.equal(result?.nextCursor, null);
    assert.equal(result?.finalizedBlock, 20n);
  });

  it("листает курсором без пропусков и повторов, даже если сверху появилось новое событие", async () => {
    const first = await listActivity(db, contract, 0n, { limit: 3 });
    assert.deepEqual(first?.nextCursor, { blockNumber: 14n, logIndex: 0 });

    // Новый вклад после первой страницы: с offset он сдвинул бы следующую страницу на одну строку.
    const late = event(19n, 0, "DonationMade", 0n, { donor: alice, amount: 1n });
    await db.insert(chainEvents).values(late);
    await applyEvents(db, contract, [late]);

    const pages = [...(first?.items ?? [])];
    let cursor: EventPosition | null = first?.nextCursor ?? null;
    while (cursor) {
      const next = await listActivity(db, contract, 0n, { limit: 3, before: cursor });
      pages.push(...(next?.items ?? []));
      cursor = next?.nextCursor ?? null;
    }

    const positions = pages.map((item) => `${item.blockNumber}.${item.logIndex}`);
    assert.deepEqual(positions, ["16.0", "15.0", "14.0", "13.0", "12.1", "12.0", "11.0", "10.0"]);
  });

  it("у сбора без срока deadline — null; неизвестная кампания — null", async () => {
    const open = await listActivity(db, contract, 1n, { limit: 50 });
    assert.deepEqual(
      open?.items.map((item) => [item.type, item.deadline]),
      [
        ["cancelled", null],
        ["created", null],
      ],
    );

    assert.equal(await listActivity(db, contract, 42n, { limit: 50 }), null);
  });
});

describe("listDonors", () => {
  it("сортирует по текущему вкладу, при равенстве — по адресу; вернувшие всё не входят", async () => {
    const result = await listDonors(db, contract, 0n, { limit: 50, offset: 0 });

    assert.deepEqual(
      result?.items.map((item) => item.donor),
      [alice, carol, dave],
    );
    assert.deepEqual(result?.items[0], {
      donor: alice,
      amount: parseEther("0.5"),
      donated: parseEther("0.5"),
      refunded: 0n,
      donations: 2,
    });
    assert.equal(result?.total, 3);
    assert.equal(result?.finalizedBlock, 20n);
  });

  it("внесено минус возвращено равно текущему вкладу проекции у каждого донатера", async () => {
    // Bob вернул вклад, а потом внёс снова: история из трёх событий, текущий вклад — только последний.
    const again = event(19n, 0, "DonationMade", 0n, { donor: bob, amount: parseEther("0.05") });
    await db.insert(chainEvents).values(again);
    await applyEvents(db, contract, [again]);

    const donors = await listDonors(db, contract, 0n, { limit: 50, offset: 0 });
    const projection = await db.select().from(contributions);

    for (const row of projection.filter((item) => item.campaignId === 0n && item.amount > 0n)) {
      const donor = donors?.items.find((item) => item.donor === row.donor);
      assert.equal(donor && donor.donated - donor.refunded, row.amount, row.donor);
    }
    const bobRow = donors?.items.find((item) => item.donor === bob);
    assert.deepEqual(bobRow && [bobRow.amount, bobRow.donated, bobRow.refunded, bobRow.donations], [parseEther("0.05"), parseEther("0.15"), parseEther("0.1"), 2]);
  });

  it("листает страницами, неизвестная кампания — null", async () => {
    const second = await listDonors(db, contract, 0n, { limit: 2, offset: 2 });
    assert.deepEqual(
      second?.items.map((item) => item.donor),
      [dave],
    );
    assert.equal(second?.total, 3);

    assert.equal(await listDonors(db, contract, 42n, { limit: 50, offset: 0 }), null);
  });
});

describe("число участников в каталоге", () => {
  it("считает адреса с текущим вкладом", async () => {
    const result = await listCampaigns(db, contract, { sort: "oldest", limit: 20, offset: 0, nowSeconds: 1_800_000_000 });

    assert.deepEqual(
      result.items.map((item) => [item.campaignId, item.donors]),
      [
        [0n, 3],
        [1n, 0],
      ],
    );
  });
});
