import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { parseEther } from "viem";

import { buildApp } from "../../app.ts";
import { campaignMetadata, campaigns, indexerCheckpoints } from "../../db/schema.ts";
import { sepoliaCrowdfunding } from "../../indexer/events.ts";
import type { ApiError } from "../../shared/errors.ts";
import { testDeps } from "../../test/app.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";
import type { CampaignJson } from "./schemas.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());

const key = { chainId: sepoliaCrowdfunding.chainId, contractAddress: sepoliaCrowdfunding.address.toLowerCase() };
const creator = "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5";
const inAWeek = BigInt(Math.floor(Date.now() / 1000) + 7 * 86_400);
// Цель больше 2^53: Number исказил бы её, строка — нет.
const hugeGoal = 2n ** 200n + 1n;

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
    });
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
