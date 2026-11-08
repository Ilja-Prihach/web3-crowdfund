import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { eq, sql } from "drizzle-orm";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage, type SiweMessage } from "viem/siwe";

import { buildApp } from "../../app.ts";
import { authNonces, authSessions } from "../../db/schema.ts";
import { createTestChain, testAppOrigin, testDeps } from "../../test/app.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";
import { hashSessionId } from "./service.ts";

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

// Сообщение, которое собрал бы frontend для одноразового ключа; поля можно испортить через overrides.
async function signedSignIn(overrides: Partial<SiweMessage> = {}, signer = privateKeyToAccount(generatePrivateKey())) {
  const { nonce } = (await requestNonce()).json<{ nonce: string }>();
  const message = createSiweMessage({
    address: signer.address,
    chainId: 11_155_111,
    domain: "localhost:3000",
    nonce,
    uri: testAppOrigin,
    version: "1",
    issuedAt: new Date(),
    statement: "Sign in to OpenFund",
    ...overrides,
  });
  return { message, signature: await signer.signMessage({ message }), address: signer.address, nonce };
}

async function verify(body: { message: string; signature: string }, deps = testDeps(db)) {
  const app = buildApp(deps);
  const response = await app.inject({ method: "POST", url: "/v1/auth/verify", payload: body });
  await app.close();
  return response;
}

function assertRejected(response: Awaited<ReturnType<typeof verify>>, label: string) {
  assert.equal(response.statusCode, 401, label);
  assert.equal(response.json<{ error: { code: string } }>().error.code, "SIWE_INVALID", label);
  assert.equal(response.headers["set-cookie"], undefined, label);
}

describe("POST /v1/auth/verify", () => {
  it("создаёт сессию: cookie с безопасными флагами, в базе только хэш, nonce удалён", async () => {
    const { message, signature, address, nonce } = await signedSignIn();
    const { chain, calls } = createTestChain("unreachable");

    const response = await verify({ message, signature }, testDeps(db, { chain }));

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
    const signed = await signedSignIn();
    assert.equal((await verify(signed)).statusCode, 200);

    assertRejected(await verify(signed), "повтор");
  });

  it("из двух одновременных входов с одной подписью проходит один", async () => {
    const signed = await signedSignIn();

    const codes = (await Promise.all([verify(signed), verify(signed)])).map((response) => response.statusCode);

    assert.deepEqual(codes.sort(), [200, 401]);
    assert.equal((await db.select().from(authSessions)).length, 1);
  });

  it("отклоняет неизвестный и просроченный nonce", async () => {
    const unknown = await signedSignIn({ nonce: "c".repeat(64) });
    assertRejected(await verify(unknown), "неизвестный nonce");

    const expired = await signedSignIn();
    await db.update(authNonces).set({ expiresAt: sql`now() - interval '1 second'` });
    assertRejected(await verify(expired), "просроченный nonce");
  });

  it("отклоняет сообщение для другого сайта, сети или версии", async () => {
    const cases: [string, Partial<SiweMessage>][] = [
      ["чужой domain", { domain: "evil.example" }],
      ["чужой uri", { uri: "https://evil.example" }],
      ["чужая схема", { scheme: "https" }],
      ["mainnet", { chainId: 1 }],
    ];
    for (const [label, overrides] of cases) {
      assertRejected(await verify(await signedSignIn(overrides)), label);
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
      assertRejected(await verify(await signedSignIn(overrides)), label);
    }
  });

  it("отклоняет подпись другого ключа и испорченную подпись", async () => {
    const signed = await signedSignIn();
    const other = privateKeyToAccount(generatePrivateKey());
    const { chain, calls } = createTestChain("rejects-signatures");

    const foreign = await verify({ message: signed.message, signature: await other.signMessage({ message: signed.message }) }, testDeps(db, { chain }));
    assertRejected(foreign, "подпись другого ключа");
    // Локально не восстановилась — значит, спросили сеть, как для смарт-кошелька.
    assert.deepEqual(calls, ["eth_call"]);

    const flipped = signed.signature.slice(0, -4) + (signed.signature.endsWith("1b") ? "001c" : "001b");
    assertRejected(await verify({ message: signed.message, signature: flipped }), "испорченная подпись");
  });

  it("отклоняет чужую подпись и при упавшем RPC", async () => {
    const signed = await signedSignIn();
    const other = privateKeyToAccount(generatePrivateKey());
    const { chain } = createTestChain("unreachable");

    const response = await verify({ message: signed.message, signature: await other.signMessage({ message: signed.message }) }, testDeps(db, { chain }));

    assertRejected(response, "RPC недоступен");
  });

  it("проверяет тело по схеме до разбора сообщения", async () => {
    for (const [label, payload] of [
      ["нет подписи", { message: "hello" }],
      ["подпись не hex", { message: "hello", signature: "not-hex" }],
      ["слишком длинное сообщение", { message: "a".repeat(2_001), signature: "0x00" }],
    ] as const) {
      const response = await verify(payload as { message: string; signature: string });
      assert.equal(response.statusCode, 400, label);
      assert.equal(response.json<{ error: { code: string } }>().error.code, "BAD_REQUEST", label);
    }
  });

  it("отвечает 401, а не 500, на текст, который не является сообщением SIWE", async () => {
    assertRejected(await verify({ message: "hello", signature: "0x00" }), "мусор");
  });
});
