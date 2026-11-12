import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { eq, sql } from "drizzle-orm";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { SiweMessage } from "viem/siwe";

import { authNonces, authSessions } from "../../db/schema.ts";
import { createTestChain, testDeps } from "../../test/app.ts";
import { requestNonce, signedSignIn, verify as verifyRequest } from "../../test/auth.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";
import { hashSessionId } from "./service.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

describe("POST /v1/auth/nonce", () => {
  it("выдаёт 32 байта в hex и запрещает кэширование", async () => {
    const response = await requestNonce(db);

    assert.equal(response.statusCode, 201);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.match(response.json<{ nonce: string }>().nonce, /^[0-9a-f]{64}$/);
  });

  it("выдаёт независимые nonce, а не сдвиг одного буфера, как generateSiweNonce() из viem", async () => {
    const first = (await requestNonce(db)).json<{ nonce: string }>().nonce;
    const second = (await requestNonce(db)).json<{ nonce: string }>().nonce;

    assert.notEqual(first, second);
    assert.notEqual(second.slice(0, 63), first.slice(1));
  });

  it("сохраняет nonce в базе со сроком 10 минут по часам базы", async () => {
    const { nonce } = (await requestNonce(db)).json<{ nonce: string }>();

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

    const { nonce } = (await requestNonce(db)).json<{ nonce: string }>();

    const rows = await db.select({ nonce: authNonces.nonce }).from(authNonces);
    assert.deepEqual(rows.map((row) => row.nonce).sort(), [alive, nonce].sort());
  });
});

function assertRejected(response: Awaited<ReturnType<typeof verifyRequest>>, label: string) {
  assert.equal(response.statusCode, 401, label);
  assert.equal(response.json<{ error: { code: string } }>().error.code, "SIWE_INVALID", label);
  assert.equal(response.headers["set-cookie"], undefined, label);
}

describe("POST /v1/auth/verify", () => {
  it("создаёт сессию: cookie с безопасными флагами, в базе только хэш, nonce удалён", async () => {
    const { message, signature, address, nonce } = await signedSignIn(db);
    const { chain, calls } = createTestChain("unreachable");

    const response = await verifyRequest(db, { message, signature }, testDeps(db, { chain }));

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    const body = response.json<{ address: string; expiresAt: string }>();
    assert.equal(body.address, address);
    const days = (Date.parse(body.expiresAt) - Date.now()) / 86_400_000;
    assert.ok(days > 6.99 && days <= 7, `срок ${days} дн.`);

    const cookie = response.cookies.find((item) => item.name === "openfund_session");
    assert.ok(cookie, "cookie выставлена");
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.sameSite, "Lax");
    assert.equal(cookie.path, "/");
    assert.equal(cookie.maxAge, 7 * 24 * 60 * 60);

    const sessions = await db.select().from(authSessions);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0]?.idHash, hashSessionId(cookie.value));
    assert.notEqual(sessions[0]?.idHash, cookie.value);
    assert.equal(sessions[0]?.address, address.toLowerCase());
    assert.equal((await db.select().from(authNonces).where(eq(authNonces.nonce, nonce))).length, 0);
    // Обычный кошелёк проверен локально: упавший RPC вход не ломает, и квота не тратится.
    assert.deepEqual(calls, []);
  });

  it("отклоняет повтор той же подписи", async () => {
    const signed = await signedSignIn(db);
    assert.equal((await verifyRequest(db, signed)).statusCode, 200);

    assertRejected(await verifyRequest(db, signed), "повтор");
  });

  it("из двух одновременных входов с одной подписью проходит один", async () => {
    const signed = await signedSignIn(db);

    const codes = (await Promise.all([verifyRequest(db, signed), verifyRequest(db, signed)])).map((response) => response.statusCode);

    assert.deepEqual(codes.sort(), [200, 401]);
    assert.equal((await db.select().from(authSessions)).length, 1);
  });

  it("отклоняет неизвестный и просроченный nonce", async () => {
    const unknown = await signedSignIn(db, { nonce: "c".repeat(64) });
    assertRejected(await verifyRequest(db, unknown), "неизвестный nonce");

    const expired = await signedSignIn(db);
    await db.update(authNonces).set({ expiresAt: sql`now() - interval '1 second'` });
    assertRejected(await verifyRequest(db, expired), "просроченный nonce");
  });

  it("отклоняет сообщение для другого сайта, сети или версии", async () => {
    const cases: [string, Partial<SiweMessage>][] = [
      ["чужой domain", { domain: "evil.example" }],
      ["чужой uri", { uri: "https://evil.example" }],
      ["чужая схема", { scheme: "https" }],
      ["mainnet", { chainId: 1 }],
    ];
    for (const [label, overrides] of cases) {
      assertRejected(await verifyRequest(db, await signedSignIn(db, overrides)), label);
    }
  });

  it("отклоняет старое, будущее и истёкшее сообщение", async () => {
    const minutes = (value: number) => new Date(Date.now() + value * 60_000);
    const cases: [string, Partial<SiweMessage>][] = [
      ["подписано 11 минут назад", { issuedAt: minutes(-11) }],
      ["подписано через 5 минут", { issuedAt: minutes(5) }],
      ["истёк expirationTime", { expirationTime: minutes(-1) }],
      ["ещё не наступил notBefore", { notBefore: minutes(5) }],
    ];
    for (const [label, overrides] of cases) {
      assertRejected(await verifyRequest(db, await signedSignIn(db, overrides)), label);
    }
  });

  it("отклоняет подпись другого ключа и испорченную подпись", async () => {
    const signed = await signedSignIn(db);
    const other = privateKeyToAccount(generatePrivateKey());
    const { chain, calls } = createTestChain("rejects-signatures");

    const foreign = await verifyRequest(db, { message: signed.message, signature: await other.signMessage({ message: signed.message }) }, testDeps(db, { chain }));
    assertRejected(foreign, "подпись другого ключа");
    // Локально не восстановилась — значит, спросили сеть, как для смарт-кошелька.
    assert.deepEqual(calls, ["eth_call"]);

    const flipped = signed.signature.slice(0, -4) + (signed.signature.endsWith("1b") ? "001c" : "001b");
    assertRejected(await verifyRequest(db, { message: signed.message, signature: flipped }), "испорченная подпись");
  });

  it("не обращается к RPC, если nonce не выдавался", async () => {
    const signed = await signedSignIn(db, { nonce: "c".repeat(64) });
    const other = privateKeyToAccount(generatePrivateKey());
    const { chain, calls } = createTestChain("rejects-signatures");

    const response = await verifyRequest(
      db,
      { message: signed.message, signature: await other.signMessage({ message: signed.message }) },
      testDeps(db, { chain }),
    );

    assertRejected(response, "выдуманный nonce");
    assert.deepEqual(calls, [], "квота RPC не тратится без выданного nonce");
  });

  it("гасит nonce при первой же попытке: после неудачной подписи он недействителен", async () => {
    const signed = await signedSignIn(db);
    const other = privateKeyToAccount(generatePrivateKey());
    const { chain, calls } = createTestChain("rejects-signatures");
    const deps = testDeps(db, { chain });

    assertRejected(
      await verifyRequest(db, { message: signed.message, signature: await other.signMessage({ message: signed.message }) }, deps),
      "чужая подпись",
    );
    for (let attempt = 0; attempt < 3; attempt++) {
      assertRejected(
        await verifyRequest(db, { message: signed.message, signature: await other.signMessage({ message: signed.message }) }, deps),
        `повторная попытка ${attempt}`,
      );
    }
    assert.deepEqual(calls, ["eth_call"], "один nonce — один вызов RPC");
    assertRejected(await verifyRequest(db, signed, deps), "верная подпись после неудачи");
  });

  it("отклоняет чужую подпись и при упавшем RPC", async () => {
    const signed = await signedSignIn(db);
    const other = privateKeyToAccount(generatePrivateKey());
    const { chain } = createTestChain("unreachable");

    const response = await verifyRequest(db, { message: signed.message, signature: await other.signMessage({ message: signed.message }) }, testDeps(db, { chain }));

    assertRejected(response, "RPC недоступен");
  });

  it("проверяет тело по схеме до разбора сообщения", async () => {
    for (const [label, payload] of [
      ["нет подписи", { message: "hello" }],
      ["подпись не hex", { message: "hello", signature: "not-hex" }],
      ["слишком длинное сообщение", { message: "a".repeat(2_001), signature: "0x00" }],
    ] as const) {
      const response = await verifyRequest(db, payload as { message: string; signature: string });
      assert.equal(response.statusCode, 400, label);
      assert.equal(response.json<{ error: { code: string } }>().error.code, "BAD_REQUEST", label);
    }
  });

  it("отвечает 401, а не 500, на текст, который не является сообщением SIWE", async () => {
    assertRejected(await verifyRequest(db, { message: "hello", signature: "0x00" }), "мусор");
  });
});
