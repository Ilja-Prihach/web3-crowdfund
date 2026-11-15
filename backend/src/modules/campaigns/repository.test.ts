import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { parseEther } from "viem";

import { campaignMetadata, campaigns, indexerCheckpoints } from "../../db/schema.ts";
import type { IndexedContract } from "../../indexer/events.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";
import { type CatalogQuery, findCampaign, listCampaigns } from "./repository.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());

const contract: IndexedContract = { chainId: 11_155_111, address: "0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A", deployBlock: 1n };
const otherContract: IndexedContract = { ...contract, address: "0x480ec361EBdD78465831eB555d3EfCf650d2a217" };
const now = 1_800_000_000;
const creator = "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5";

type Seed = {
  id: bigint;
  title: string;
  description?: string;
  mode?: "fixed_deadline" | "open_ended";
  goal?: bigint;
  raised?: bigint;
  deadline?: bigint;
  cancelled?: boolean;
  withdrawn?: boolean;
};

async function seed(target: IndexedContract, rows: Seed[]) {
  const key = { chainId: target.chainId, contractAddress: target.address.toLowerCase() };
  await db.insert(campaignMetadata).values(
    rows.map((row) => ({
      ...key,
      campaignId: row.id,
      fundingMode: row.mode ?? "fixed_deadline",
      title: row.title,
      description: row.description ?? "Описание",
    })),
  );
  await db.insert(campaigns).values(
    rows.map((row) => ({
      ...key,
      campaignId: row.id,
      creator,
      goal: row.goal ?? parseEther("1"),
      deadline: row.mode === "open_ended" ? 0n : (row.deadline ?? BigInt(now + 86_400)),
      totalRaised: row.raised ?? 0n,
      cancelled: row.cancelled ?? false,
      fundsWithdrawn: row.withdrawn ?? false,
      createdBlock: 100n + row.id,
      updatedBlock: 100n + row.id,
    })),
  );
}

// По кампании на каждую ветку _getCampaignStatus.
beforeEach(async () => {
  await resetTestDatabase(db);
  await seed(contract, [
    { id: 0n, title: "Лекторий в библиотеке", raised: parseEther("0.1") },
    { id: 1n, title: "Срок истёк ровно сейчас", deadline: BigInt(now) },
    { id: 2n, title: "Собрали после срока", description: "Цель 100% достигнута", raised: parseEther("1"), deadline: BigInt(now - 10) },
    { id: 3n, title: "Без срока", mode: "open_ended", raised: parseEther("0.2") },
    { id: 4n, title: "Отменённая", cancelled: true, raised: parseEther("0.5") },
    { id: 5n, title: "Выведенная", raised: parseEther("2"), withdrawn: true },
  ]);
  await seed(otherContract, [{ id: 0n, title: "Лекторий чужого контракта" }]);
});

const query = (overrides: Partial<CatalogQuery> = {}): CatalogQuery => ({
  sort: "newest",
  limit: 20,
  offset: 0,
  nowSeconds: now,
  ...overrides,
});

const ids = (result: { items: { campaignId: bigint }[] }) => result.items.map((item) => item.campaignId);

describe("listCampaigns", () => {
  it("вычисляет статус по правилам контракта, а deadline = now считает провалом", async () => {
    const result = await listCampaigns(db, contract, query({ sort: "oldest" }));

    assert.deepEqual(
      result.items.map((item) => item.status),
      ["active", "failed", "successful", "active", "cancelled", "withdrawn"],
    );
    const secondEarlier = await findCampaign(db, contract, 1n, now - 1);
    assert.equal(secondEarlier.campaign?.status, "active", "за секунду до срока сбор ещё идёт");
  });

  it("отдаёт кампании только своего контракта", async () => {
    const result = await listCampaigns(db, contract, query({ q: "Лекторий" }));

    assert.deepEqual(ids(result), [0n]);
    assert.equal(result.total, 1);
  });

  it("фильтрует по нескольким статусам и режиму до пагинации: total считает отобранное", async () => {
    const finished = await listCampaigns(
      db,
      contract,
      query({ statuses: ["successful", "failed", "withdrawn", "cancelled"], limit: 2 }),
    );
    assert.deepEqual(ids(finished), [5n, 4n]);
    assert.equal(finished.total, 4);

    const open = await listCampaigns(db, contract, query({ mode: "open_ended" }));
    assert.deepEqual(ids(open), [3n]);
  });

  it("ищет без учёта регистра в названии и описании, а % ищет как символ", async () => {
    assert.deepEqual(ids(await listCampaigns(db, contract, query({ q: "лекторий" }))), [0n]);
    assert.deepEqual(ids(await listCampaigns(db, contract, query({ q: "ДОСТИГНУТА" }))), [2n]);
    assert.deepEqual(ids(await listCampaigns(db, contract, query({ q: "100%" }))), [2n]);
    // Без экранирования «%» и «_» совпали бы с любым названием.
    assert.deepEqual(ids(await listCampaigns(db, contract, query({ q: "%" }))), [2n]);
    assert.deepEqual(ids(await listCampaigns(db, contract, query({ q: "_" }))), []);
  });

  it("сортирует по собранной сумме, при равенстве — по id, и по новизне в обе стороны", async () => {
    await seed(contract, [{ id: 6n, title: "Ещё 0,2 ETH", raised: parseEther("0.2") }]);

    assert.deepEqual(ids(await listCampaigns(db, contract, query({ sort: "raised" }))), [5n, 2n, 4n, 6n, 3n, 0n, 1n]);
    assert.deepEqual(ids(await listCampaigns(db, contract, query({ sort: "newest", limit: 3 }))), [6n, 5n, 4n]);
    assert.deepEqual(ids(await listCampaigns(db, contract, query({ sort: "oldest", limit: 3 }))), [0n, 1n, 2n]);
  });

  it("листает страницы без пропусков, а за последней отдаёт пустой список с тем же total", async () => {
    const pages = [];
    for (let offset = 0; offset < 6; offset += 4) pages.push(...ids(await listCampaigns(db, contract, query({ limit: 4, offset }))));
    assert.deepEqual(pages, [5n, 4n, 3n, 2n, 1n, 0n]);

    const beyond = await listCampaigns(db, contract, query({ offset: 100 }));
    assert.deepEqual(beyond.items, []);
    assert.equal(beyond.total, 6);
  });

  it("сообщает checkpoint indexer как finalizedBlock, без checkpoint — null", async () => {
    assert.equal((await listCampaigns(db, contract, query())).finalizedBlock, null);

    await db.insert(indexerCheckpoints).values({
      chainId: contract.chainId,
      contractAddress: contract.address.toLowerCase(),
      lastBlock: 12_141_025n,
    });

    assert.equal((await listCampaigns(db, contract, query())).finalizedBlock, 12_141_025n);
  });
});

describe("findCampaign", () => {
  it("отдаёт одну кампанию со статусом и null для неизвестного id", async () => {
    const found = await findCampaign(db, contract, 3n, now);
    assert.equal(found.campaign?.title, "Без срока");
    assert.equal(found.campaign?.status, "active");
    assert.equal(found.campaign?.deadline, 0n);

    assert.equal((await findCampaign(db, contract, 42n, now)).campaign, null);
  });
});
