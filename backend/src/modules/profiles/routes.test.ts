import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { eq } from "drizzle-orm";

import { buildApp } from "../../app.ts";
import { authSessions, campaignMetadata, campaigns, contributions, indexerCheckpoints, profiles } from "../../db/schema.ts";
import { sepoliaCrowdfunding } from "../../indexer/events.ts";
import { testAppOrigin, testDeps } from "../../test/app.ts";
import { signInForCookie } from "../../test/auth.ts";
import { createTestDatabase, postgresErrorCode, resetTestDatabase } from "../../test/database.ts";
import type { CampaignJson } from "../campaigns/schemas.ts";
import { saveProfile } from "./repository.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));
const alice = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const bob = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const payload = { name: "  Автор  ", bio: "  Открытые проекты  " };
type ProfileJson = { address: string; name: string | null; bio: string | null; createdAt: string; updatedAt: string };
type Page = { items: CampaignJson[]; total: number; finalizedBlock: string | null };

async function context() {
  const { address, sessionId } = await signInForCookie(db);
  const app = buildApp(testDeps(db));
  after(() => app.close());
  return { app, address, cookies: { openfund_session: sessionId }, headers: { origin: testAppOrigin } };
}

describe("профили", () => {
  it("создаёт и обновляет только профиль адреса сессии, публично читает без учёта регистра", async () => {
    const { app, address, cookies, headers } = await context();
    const put = await app.inject({ method: "PUT", url: "/v1/profiles/me", cookies, headers, payload: { ...payload, address: bob } });
    assert.equal(put.statusCode, 200);
    const first = put.json<ProfileJson>();
    assert.equal(first.address, address.toLowerCase());
    assert.equal(first.name, "Автор");
    assert.equal(first.bio, "Открытые проекты");
    const changed = await app.inject({ method: "PUT", url: "/v1/profiles/me", cookies, headers, payload: { name: "Новое имя", bio: " " } });
    assert.equal(changed.statusCode, 200);
    assert.equal(changed.json<ProfileJson>().createdAt, first.createdAt);
    const read = await app.inject({ method: "GET", url: `/v1/profiles/${address}` });
    assert.equal(read.statusCode, 200);
    assert.equal(read.json<ProfileJson>().name, "Новое имя");
    assert.equal(read.json<ProfileJson>().bio, null);
    assert.equal(await db.$count(profiles), 1);
  });

  it("без сессии, с чужим Origin и с истёкшей сессией запрещает запись", async () => {
    const { app, address, cookies, headers } = await context();
    const anonymous = await app.inject({ method: "PUT", url: "/v1/profiles/me", payload });
    const foreign = await app.inject({ method: "PUT", url: "/v1/profiles/me", cookies, headers: { origin: "https://evil.example" }, payload });
    await db.update(authSessions).set({ expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 10000) }).where(eq(authSessions.address, address.toLowerCase()));
    const expired = await app.inject({ method: "PUT", url: "/v1/profiles/me", cookies, headers, payload });
    assert.deepEqual([anonymous.statusCode, foreign.statusCode, expired.statusCode], [401, 403, 401]);
    assert.equal(await db.$count(profiles), 0);
  });

  it("сессия другого кошелька создаёт отдельный профиль и не меняет существующий", async () => {
    await saveProfile(db, alice, { name: "Alice", bio: null });
    const { app, cookies, headers } = await context();
    const result = await app.inject({ method: "PUT", url: "/v1/profiles/me", cookies, headers, payload: { ...payload, address: alice } });
    assert.equal(result.statusCode, 200);
    const aliceProfile = await app.inject({ method: "GET", url: `/v1/profiles/${alice}` });
    assert.equal(aliceProfile.json<ProfileJson>().name, "Alice");
    assert.equal(await db.$count(profiles), 2);
  });

  it("отклоняет длинные поля и неверные адреса, пустой профиль хранит как null", async () => {
    const { app, address, cookies, headers } = await context();
    for (const body of [{ name: "x".repeat(81), bio: null }, { name: null, bio: "x".repeat(1001) }]) {
      assert.equal((await app.inject({ method: "PUT", url: "/v1/profiles/me", cookies, headers, payload: body })).statusCode, 400);
    }
    assert.equal((await app.inject({ method: "GET", url: "/v1/profiles/not-an-address" })).statusCode, 400);
    assert.equal((await app.inject({ method: "GET", url: `/v1/profiles/${alice}` })).statusCode, 404);
    const empty = await app.inject({ method: "PUT", url: "/v1/profiles/me", cookies, headers, payload: { name: " ", bio: null } });
    assert.equal(empty.json<ProfileJson>().name, null);
    assert.equal(empty.json<ProfileJson>().address, address.toLowerCase());
  });

  it("параллельные PUT одного кошелька сохраняют одну строку", async () => {
    const { app, cookies, headers } = await context();
    const replies = await Promise.all(Array.from({ length: 5 }, (_, index) => app.inject({
      method: "PUT", url: "/v1/profiles/me", cookies, headers, payload: { name: `Имя ${index}`, bio: null },
    })));
    assert.ok(replies.every((reply) => reply.statusCode === 200));
    assert.equal(await db.$count(profiles), 1);
  });

  it("БД защищает формат, уникальность и лимиты независимо от API", async () => {
    await saveProfile(db, alice, { name: "Alice", bio: null });
    for (const row of [{ address: alice, name: "Another" }, { address: alice.toUpperCase() }, { address: bob, name: "x".repeat(81) }]) {
      await assert.rejects(db.insert(profiles).values(row), (error) => ["23505", "23514"].includes(postgresErrorCode(error) ?? ""));
    }
  });
});

describe("кампании публичного адреса", () => {
  it("отбирает до пагинации, сохраняет полностью возвращённую поддержку и блок снимка", async () => {
    const key = { chainId: sepoliaCrowdfunding.chainId, contractAddress: sepoliaCrowdfunding.address.toLowerCase() };
    for (const id of [0n, 1n, 2n]) {
      await db.insert(campaignMetadata).values({ ...key, campaignId: id, title: `Проект ${id}`, description: "Описание", fundingMode: "open_ended" });
      await db.insert(campaigns).values({ ...key, campaignId: id, creator: id === 1n ? bob : alice, goal: 2n ** 200n, deadline: 0n, totalRaised: 0n, fundsWithdrawn: false, cancelled: false, createdBlock: 1n, updatedBlock: 1n });
    }
    await db.insert(contributions).values([
      { ...key, campaignId: 0n, donor: alice, amount: 0n, updatedBlock: 2n },
      { ...key, campaignId: 1n, donor: alice, amount: 1n, updatedBlock: 2n },
      { ...key, campaignId: 2n, donor: bob, amount: 1n, updatedBlock: 2n },
    ]);
    await db.insert(indexerCheckpoints).values({ ...key, lastBlock: 42n });
    const app = buildApp(testDeps(db));
    after(() => app.close());
    const get = (path: string) => app.inject({ method: "GET", url: `/v1/profiles/${alice}/${path}` });
    const created = await get("campaigns/created?limit=1");
    assert.equal(created.statusCode, 200);
    assert.deepEqual(created.json<Page>().items.map((item) => item.id), ["2"]);
    assert.equal(created.json<Page>().total, 2);
    assert.equal(created.json<Page>().finalizedBlock, "42");
    const next = await get("campaigns/created?limit=1&offset=1");
    assert.deepEqual(next.json<Page>().items.map((item) => item.id), ["0"]);
    const supported = await get("campaigns/supported");
    assert.deepEqual(supported.json<Page>().items.map((item) => item.id), ["1", "0"]);
    assert.equal(supported.json<Page>().items[0]?.goal, (2n ** 200n).toString());
    assert.equal((await get("campaigns/supported?limit=51")).statusCode, 400);
    assert.equal((await get("campaigns/supported?offset=10001")).statusCode, 400);
  });

  it("без профиля и истории возвращает пустой список и неизвестный checkpoint", async () => {
    const app = buildApp(testDeps(db));
    after(() => app.close());
    const response = await app.inject({ method: "GET", url: `/v1/profiles/${alice}/campaigns/supported` });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { items: [], total: 0, limit: 20, offset: 0, finalizedBlock: null });
  });
});
