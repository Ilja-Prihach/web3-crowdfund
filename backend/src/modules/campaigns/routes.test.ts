import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { parseEther } from "viem";

import { buildApp } from "../../app.ts";
import {
  campaignDetails,
  campaignMetadata,
  campaigns,
  chainEvents,
  contributions,
  indexerCheckpoints,
} from "../../db/schema.ts";
import { sepoliaCrowdfunding } from "../../indexer/events.ts";
import type { ApiError } from "../../shared/errors.ts";
import { testDeps } from "../../test/app.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";
import type { ActivityItemJson, CampaignJson, DonorJson } from "./schemas.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());

const key = { chainId: sepoliaCrowdfunding.chainId, contractAddress: sepoliaCrowdfunding.address.toLowerCase() };
const creator = "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5";
const inAWeek = BigInt(Math.floor(Date.now() / 1000) + 7 * 86_400);
// Цель больше 2^53: Number исказил бы её, строка — нет.
const hugeGoal = 2n ** 200n + 1n;
const alice = "0xa11ce00000000000000000000000000000000001";
const bob = "0xb0b0000000000000000000000000000000000002";
// Хеш транзакции из позиции события: у каждого события свой.
const txHash = (blockNumber: bigint, logIndex: number) =>
  `0x${blockNumber.toString(16).padStart(60, "0")}${logIndex.toString(16).padStart(4, "0")}`;

beforeEach(async () => {
  await resetTestDatabase(db);
  await db.insert(campaignMetadata).values([
    { ...key, campaignId: 0n, fundingMode: "fixed_deadline", title: "Лекторий", description: "Сбор на зал" },
    { ...key, campaignId: 1n, fundingMode: "open_ended", title: "Без срока", description: "Открытый сбор" },
  ]);
  const base = { ...key, creator, cancelled: false, fundsWithdrawn: false, createdBlock: 100n, updatedBlock: 100n };
  await db.insert(campaigns).values([
    { ...base, campaignId: 0n, goal: parseEther("1"), deadline: inAWeek, totalRaised: parseEther("1") },
    { ...base, campaignId: 1n, goal: hugeGoal, deadline: 0n, totalRaised: parseEther("0.2"), createdBlock: 101n, updatedBlock: 101n },
  ]);
  await db.insert(indexerCheckpoints).values({ ...key, lastBlock: 12_141_025n });

  // Журнал кампании 0: создание, три вклада и возврат bob. Последнее событие записано до миграции — без времени.
  const event = (blockNumber: bigint, logIndex: number, eventName: string, args: Record<string, string>, timed = true) => ({
    ...key,
    campaignId: 0n,
    blockNumber,
    blockTimestamp: timed ? new Date(Number(blockNumber) * 1000) : null,
    txHash: txHash(blockNumber, logIndex),
    logIndex,
    eventName,
    args,
  });
  await db.insert(chainEvents).values([
    event(100n, 0, "CampaignCreated", { creator, goal: parseEther("1").toString(), deadline: inAWeek.toString() }),
    event(110n, 0, "DonationMade", { donor: alice, amount: parseEther("0.6").toString() }),
    event(110n, 3, "DonationMade", { donor: bob, amount: parseEther("0.1").toString() }),
    event(120n, 1, "RefundClaimed", { donor: bob, amount: parseEther("0.1").toString() }),
    event(130n, 0, "DonationMade", { donor: bob, amount: parseEther("0.4").toString() }, false),
  ]);
  await db.insert(contributions).values([
    { ...key, campaignId: 0n, donor: alice, amount: parseEther("0.6"), updatedBlock: 110n },
    { ...key, campaignId: 0n, donor: bob, amount: parseEther("0.4"), updatedBlock: 130n },
  ]);
});

type ListBody = { items: CampaignJson[]; total: number; limit: number; offset: number; finalizedBlock: string | null };

async function get(url: string, deps = testDeps(db)) {
  const app = buildApp(deps);
  try {
    return await app.inject({ method: "GET", url });
  } finally {
    await app.close();
  }
}

describe("GET /v1/campaigns", () => {
  it("отдаёт страницу каталога: суммы строками wei, срок null для сбора без срока, блок данных", async () => {
    const response = await get("/v1/campaigns");

    assert.equal(response.statusCode, 200);
    const body = response.json<ListBody>();
    assert.deepEqual(body.items[0], {
      id: "1",
      creator,
      fundingMode: "open_ended",
      title: "Без срока",
      description: "Открытый сбор",
      goal: hugeGoal.toString(),
      deadline: null,
      totalRaised: parseEther("0.2").toString(),
      status: "active",
      createdBlock: "101",
      donors: 0,
      category: null,
      coverUrl: null,
    });
    assert.equal(body.items[1]?.donors, 2);
    assert.equal(body.items[1]?.deadline, inAWeek.toString());
    assert.equal(body.items[1]?.status, "successful");
    assert.deepEqual({ total: body.total, limit: body.limit, offset: body.offset }, { total: 2, limit: 20, offset: 0 });
    assert.equal(body.finalizedBlock, "12141025");
  });

  it("принимает один и несколько статусов, поиск, режим и сортировку", async () => {
    const ids = async (url: string) => (await get(url)).json<ListBody>().items.map((item) => item.id);

    assert.deepEqual(await ids("/v1/campaigns?status=active"), ["1"]);
    assert.deepEqual(await ids("/v1/campaigns?status=active&status=successful&sort=oldest"), ["0", "1"]);
    assert.deepEqual(await ids("/v1/campaigns?q=%D0%BB%D0%B5%D0%BA%D1%82%D0%BE%D1%80%D0%B8%D0%B9"), ["0"]);
    assert.deepEqual(await ids("/v1/campaigns?mode=fixed_deadline"), ["0"]);
    assert.deepEqual(await ids("/v1/campaigns?sort=raised&limit=1"), ["0"]);
    // Строка из пробелов — не поиск: каталог целиком.
    assert.deepEqual(await ids("/v1/campaigns?q=%20%20%20"), ["1", "0"]);
  });

  it("отклоняет параметры за границами единым форматом ошибки", async () => {
    for (const query of [
      "limit=0",
      "limit=51",
      "limit=abc",
      "offset=-1",
      "offset=10001",
      "sort=popular",
      "status=paused",
      "mode=flexible",
      "category=games",
      "q=",
      `q=${"a".repeat(101)}`,
    ]) {
      const response = await get(`/v1/campaigns?${query}`);
      assert.equal(response.statusCode, 400, query);
      assert.equal(response.json<ApiError>().error.code, "BAD_REQUEST", query);
    }
  });

  it("ограничивает частоту запросов с одного адреса", async () => {
    const app = buildApp({ ...testDeps(db), catalogRequestsPerMinute: 2 });
    try {
      const statuses = [];
      for (let index = 0; index < 3; index++) statuses.push((await app.inject({ method: "GET", url: "/v1/campaigns" })).statusCode);
      assert.deepEqual(statuses, [200, 200, 429]);
    } finally {
      await app.close();
    }
  });
});

describe("категория и обложка в каталоге", () => {
  const cover = `covers/${"c".repeat(64)}.webp`;
  beforeEach(() =>
    db.insert(campaignDetails).values({ ...key, campaignId: 0n, category: "education", coverKey: cover, updatedBy: creator }),
  );

  it("отдаёт категорию и адрес обложки, а кампанию без деталей оставляет с null", async () => {
    const items = (await get("/v1/campaigns?sort=oldest")).json<ListBody>().items;

    assert.deepEqual(
      items.map(({ id, category, coverUrl }) => ({ id, category, coverUrl })),
      [
        { id: "0", category: "education", coverUrl: `/v1/media/${cover}` },
        { id: "1", category: null, coverUrl: null },
      ],
    );
    const one = (await get("/v1/campaigns/0")).json<{ campaign: CampaignJson }>().campaign;
    assert.equal(one.category, "education");
  });

  it("фильтрует по категории до пагинации: total совпадает с отбором", async () => {
    const education = (await get("/v1/campaigns?category=education")).json<ListBody>();
    const community = (await get("/v1/campaigns?category=community")).json<ListBody>();

    assert.deepEqual([education.items.map((item) => item.id), education.total], [["0"], 1]);
    assert.deepEqual([community.items, community.total], [[], 0]);
  });
});

describe("GET /v1/campaigns/:id", () => {
  it("отдаёт одну кампанию с блоком данных", async () => {
    const response = await get("/v1/campaigns/0");

    assert.equal(response.statusCode, 200);
    const body = response.json<{ campaign: CampaignJson; finalizedBlock: string }>();
    assert.equal(body.campaign.title, "Лекторий");
    assert.equal(body.finalizedBlock, "12141025");
  });

  it("неизвестная кампания — 404 CAMPAIGN_NOT_FOUND, кривой id — 400", async () => {
    const missing = await get("/v1/campaigns/42");
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json<ApiError>().error.code, "CAMPAIGN_NOT_FOUND");

    for (const id of ["abc", "-1", "01", "1.5", "9".repeat(79)]) {
      assert.equal((await get(`/v1/campaigns/${id}`)).statusCode, 400, id);
    }
  });
});

type ActivityBody = { items: ActivityItemJson[]; nextCursor: string | null; finalizedBlock: string | null };

describe("GET /v1/campaigns/:id/activity", () => {
  it("отдаёт ленту от новых событий к старым: суммы строками wei, время блока или null", async () => {
    const response = await get("/v1/campaigns/0/activity?limit=2");

    assert.equal(response.statusCode, 200);
    const body = response.json<ActivityBody>();
    assert.deepEqual(body.items[0], {
      type: "donation",
      actor: bob,
      amount: parseEther("0.4").toString(),
      deadline: null,
      blockNumber: "130",
      blockTimestamp: null,
      txHash: txHash(130n, 0),
      logIndex: 0,
    });
    assert.deepEqual(
      { type: body.items[1]?.type, amount: body.items[1]?.amount, blockTimestamp: body.items[1]?.blockTimestamp },
      { type: "refund", amount: parseEther("0.1").toString(), blockTimestamp: new Date(120_000).toISOString() },
    );
    assert.equal(body.nextCursor, "120-1");
    assert.equal(body.finalizedBlock, "12141025");
  });

  it("курсор ведёт по всей ленте без пропусков и повторов до nextCursor null", async () => {
    const seen: string[] = [];
    let url: string | null = "/v1/campaigns/0/activity?limit=2";
    while (url) {
      const body: ActivityBody = (await get(url)).json<ActivityBody>();
      seen.push(...body.items.map((item) => `${item.blockNumber}-${item.logIndex}`));
      url = body.nextCursor && `/v1/campaigns/0/activity?limit=2&before=${body.nextCursor}`;
    }

    assert.deepEqual(seen, ["130-0", "120-1", "110-3", "110-0", "100-0"]);
    const created = (await get("/v1/campaigns/0/activity?before=110-0")).json<ActivityBody>().items;
    assert.deepEqual(
      created.map(({ type, actor, deadline }) => ({ type, actor, deadline })),
      [{ type: "created", actor: creator, deadline: inAWeek.toString() }],
    );
  });

  it("кампания без событий — пустая лента, неизвестная — 404, кривой курсор и лимит — 400", async () => {
    const empty = (await get("/v1/campaigns/1/activity")).json<ActivityBody>();
    assert.deepEqual({ items: empty.items, nextCursor: empty.nextCursor }, { items: [], nextCursor: null });

    const missing = await get("/v1/campaigns/42/activity");
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.json<ApiError>().error.code, "CAMPAIGN_NOT_FOUND");

    // Самый длинный допустимый курсор помещается в bigint и integer PostgreSQL; длиннее отсекает схема.
    const longest = `${"9".repeat(18)}-${"9".repeat(9)}`;
    assert.equal((await get(`/v1/campaigns/0/activity?before=${longest}`)).statusCode, 200, longest);
    for (const query of [
      "before=abc",
      "before=12",
      "before=12-",
      "before=-1-0",
      "before=01-0",
      "before=1-1234567890",
      `before=${"9".repeat(19)}-0`,
      "limit=0",
      "limit=51",
    ]) {
      const response = await get(`/v1/campaigns/0/activity?${query}`);
      assert.equal(response.statusCode, 400, query);
      assert.equal(response.json<ApiError>().error.code, "BAD_REQUEST", query);
    }
  });
});

type DonorsBody = { items: DonorJson[]; total: number; limit: number; offset: number; finalizedBlock: string | null };

describe("GET /v1/campaigns/:id/donors", () => {
  it("отдаёт донатеров по убыванию вклада с историей внесённого и возвращённого", async () => {
    const response = await get("/v1/campaigns/0/donors");

    assert.equal(response.statusCode, 200);
    const body = response.json<DonorsBody>();
    assert.deepEqual(body.items, [
      { donor: alice, amount: parseEther("0.6").toString(), donated: parseEther("0.6").toString(), refunded: "0", donations: 1 },
      {
        donor: bob,
        amount: parseEther("0.4").toString(),
        donated: parseEther("0.5").toString(),
        refunded: parseEther("0.1").toString(),
        donations: 2,
      },
    ]);
    assert.deepEqual({ total: body.total, limit: body.limit, offset: body.offset }, { total: 2, limit: 20, offset: 0 });
    assert.equal(body.finalizedBlock, "12141025");
  });

  it("листает страницами, неизвестная кампания — 404, параметры за границами — 400", async () => {
    const second = (await get("/v1/campaigns/0/donors?limit=1&offset=1")).json<DonorsBody>();
    assert.deepEqual(second.items.map((item) => item.donor), [bob]);
    assert.equal(second.total, 2);

    assert.equal((await get("/v1/campaigns/42/donors")).statusCode, 404);
    for (const query of ["limit=0", "limit=51", "offset=-1", "offset=10001"]) {
      assert.equal((await get(`/v1/campaigns/0/donors?${query}`)).statusCode, 400, query);
    }
  });
});
