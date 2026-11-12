import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { eq, sql } from "drizzle-orm";

import { buildApp } from "../../app.ts";
import { authSessions } from "../../db/schema.ts";
import { testDeps } from "../../test/app.ts";
import { signInForCookie } from "../../test/auth.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";
import { hashSessionId } from "./service.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

async function request(method: "GET" | "POST", url: string, sessionId?: string) {
  const app = buildApp(testDeps(db));
  const response = await app.inject({
    method,
    url,
    cookies: sessionId === undefined ? {} : { openfund_session: sessionId },
  });
  await app.close();
  return response;
}

// Cookie удаляется ответом с пустым значением и сроком в прошлом, с теми же атрибутами.
function assertCookieCleared(response: Awaited<ReturnType<typeof request>>, label: string) {
  const cookie = response.cookies.find((item) => item.name === "openfund_session");
  assert.ok(cookie, `${label}: cookie очищается`);
  assert.equal(cookie.value, "", label);
  assert.ok(cookie.expires && cookie.expires.getTime() <= Date.now(), label);
  assert.equal(cookie.path, "/", label);
  assert.equal(cookie.httpOnly, true, label);
  assert.equal(cookie.secure, true, label);
}

function assertUnauthorized(response: Awaited<ReturnType<typeof request>>, label: string) {
  assert.equal(response.statusCode, 401, label);
  assert.equal(response.json<{ error: { code: string } }>().error.code, "UNAUTHORIZED", label);
}

describe("GET /v1/auth/session", () => {
  it("возвращает адрес и срок сессии после входа", async () => {
    const { address, sessionId } = await signInForCookie(db);

    const response = await request("GET", "/v1/auth/session", sessionId);

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    const body = response.json<{ address: string; expiresAt: string }>();
    assert.equal(body.address, address);
    assert.ok(Date.parse(body.expiresAt) > Date.now() + 6.9 * 86_400_000);
  });

  it("без cookie отвечает 401 и ничего не трогает", async () => {
    const response = await request("GET", "/v1/auth/session");

    assertUnauthorized(response, "без cookie");
    assert.equal(response.headers["set-cookie"], undefined);
  });

  it("с подделанной cookie отвечает 401 и очищает её", async () => {
    await signInForCookie(db);

    const response = await request("GET", "/v1/auth/session", "forged-session-id");

    assertUnauthorized(response, "подделка");
    assertCookieCleared(response, "подделка");
  });

  it("с просроченной сессией отвечает 401, даже если строка ещё в базе", async () => {
    const { sessionId } = await signInForCookie(db);
    await db
      .update(authSessions)
      .set({ createdAt: sql`now() - interval '8 days'`, expiresAt: sql`now() - interval '1 second'` });

    const response = await request("GET", "/v1/auth/session", sessionId);

    assertUnauthorized(response, "просрочена");
    assertCookieCleared(response, "просрочена");
  });

  it("попутно удаляет просроченные сессии при следующем входе", async () => {
    await signInForCookie(db);
    await db
      .update(authSessions)
      .set({ createdAt: sql`now() - interval '8 days'`, expiresAt: sql`now() - interval '1 second'` });

    const { sessionId } = await signInForCookie(db);

    const rows = await db.select({ idHash: authSessions.idHash }).from(authSessions);
    assert.deepEqual(rows, [{ idHash: hashSessionId(sessionId) }]);
  });
});

describe("POST /v1/auth/logout", () => {
  it("удаляет сессию в базе и очищает cookie; после выхода сессии нет", async () => {
    const { sessionId } = await signInForCookie(db);

    const response = await request("POST", "/v1/auth/logout", sessionId);

    assert.equal(response.statusCode, 204);
    assertCookieCleared(response, "выход");
    const rows = await db.select().from(authSessions).where(eq(authSessions.idHash, hashSessionId(sessionId)));
    assert.equal(rows.length, 0);
    assertUnauthorized(await request("GET", "/v1/auth/session", sessionId), "после выхода");
  });

  it("не трогает чужие сессии", async () => {
    const mine = await signInForCookie(db);
    const other = await signInForCookie(db);

    await request("POST", "/v1/auth/logout", mine.sessionId);

    assert.equal((await request("GET", "/v1/auth/session", other.sessionId)).statusCode, 200);
  });

  it("идемпотентен: без cookie и повторно отвечает 204", async () => {
    const { sessionId } = await signInForCookie(db);

    assert.equal((await request("POST", "/v1/auth/logout")).statusCode, 204);
    assert.equal((await request("POST", "/v1/auth/logout", sessionId)).statusCode, 204);
    assert.equal((await request("POST", "/v1/auth/logout", sessionId)).statusCode, 204);
  });
});
