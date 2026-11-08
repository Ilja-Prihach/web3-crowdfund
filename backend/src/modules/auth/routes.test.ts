import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { sql } from "drizzle-orm";

import { buildApp } from "../../app.ts";
import { authNonces } from "../../db/schema.ts";
import { testDeps } from "../../test/app.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

async function requestNonce() {
  const app = buildApp(testDeps(db));
  const response = await app.inject({ method: "POST", url: "/v1/auth/nonce" });
  await app.close();
  return response;
}

describe("POST /v1/auth/nonce", () => {
  it("выдаёт 32 байта в hex и запрещает кэширование", async () => {
    const response = await requestNonce();

    assert.equal(response.statusCode, 201);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.match(response.json<{ nonce: string }>().nonce, /^[0-9a-f]{64}$/);
  });

  it("выдаёт независимые nonce, а не сдвиг одного буфера, как generateSiweNonce() из viem", async () => {
    const first = (await requestNonce()).json<{ nonce: string }>().nonce;
    const second = (await requestNonce()).json<{ nonce: string }>().nonce;

    assert.notEqual(first, second);
    assert.notEqual(second.slice(0, 63), first.slice(1));
  });

  it("сохраняет nonce в базе со сроком 10 минут по часам базы", async () => {
    const { nonce } = (await requestNonce()).json<{ nonce: string }>();

    const result = await db.execute<{ seconds: number }>(
      sql`select extract(epoch from ${authNonces.expiresAt} - now())::float as seconds from ${authNonces} where ${authNonces.nonce} = ${nonce}`,
    );
    const seconds = result.rows[0]?.seconds ?? 0;
    assert.ok(seconds > 590 && seconds <= 600, `осталось ${seconds} с`);
  });

  it("попутно удаляет просроченные nonce и не трогает живые", async () => {
    const expired = "e".repeat(64);
    const alive = "a".repeat(64);
    await db.insert(authNonces).values([
      { nonce: expired, expiresAt: sql`now() - interval '1 second'` },
      { nonce: alive, expiresAt: sql`now() + interval '5 minutes'` },
    ]);

    const { nonce } = (await requestNonce()).json<{ nonce: string }>();

    const rows = await db.select({ nonce: authNonces.nonce }).from(authNonces);
    assert.deepEqual(rows.map((row) => row.nonce).sort(), [alive, nonce].sort());
  });
});
