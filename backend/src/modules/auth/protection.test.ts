import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import type { FastifyServerOptions } from "fastify";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { type AppDeps, buildApp } from "../../app.ts";
import { authNonces } from "../../db/schema.ts";
import { loggerOptions } from "../../shared/logger.ts";
import { createTestChain, testAppOrigin, testDeps } from "../../test/app.ts";
import { signedSignIn } from "../../test/auth.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";
import { type AuthLimits, defaultAuthLimits } from "./service.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

function limits(overrides: Partial<Omit<AuthLimits, "perIp">> & { perIp?: Partial<AuthLimits["perIp"]> }): AuthLimits {
  return { ...defaultAuthLimits, ...overrides, perIp: { ...defaultAuthLimits.perIp, ...overrides.perIp } };
}

// Одно приложение на серию запросов: счётчики лимитов живут в памяти экземпляра.
async function withApp<T>(deps: AppDeps, options: FastifyServerOptions, run: (app: ReturnType<typeof buildApp>) => Promise<T>) {
  const app = buildApp(deps, options);
  try {
    return await run(app);
  } finally {
    await app.close();
  }
}

function errorCode(response: { json: <T>() => T }) {
  return response.json<{ error: { code: string } }>().error.code;
}

describe("лимиты по адресу клиента", () => {
  it("после лимита отвечает 429 RATE_LIMITED, а другой адрес не задет", async () => {
    const deps = testDeps(db, { authLimits: limits({ perIp: { nonce: 2 } }) });
    await withApp(deps, {}, async (app) => {
      const nonce = (remoteAddress: string) => app.inject({ method: "POST", url: "/v1/auth/nonce", remoteAddress });

      assert.equal((await nonce("203.0.113.1")).statusCode, 201);
      assert.equal((await nonce("203.0.113.1")).statusCode, 201);
      const limited = await nonce("203.0.113.1");
      assert.equal(limited.statusCode, 429);
      assert.equal(errorCode(limited), "RATE_LIMITED");
      assert.ok(limited.headers["retry-after"]);

      assert.equal((await nonce("203.0.113.2")).statusCode, 201);
    });
  });

  it("без TRUST_PROXY подделанный X-Forwarded-For не создаёт новые адреса", async () => {
    const deps = testDeps(db, { authLimits: limits({ perIp: { nonce: 1 } }) });
    await withApp(deps, {}, async (app) => {
      const nonce = (forwardedFor: string) =>
        app.inject({
          method: "POST",
          url: "/v1/auth/nonce",
          remoteAddress: "198.51.100.9",
          headers: { "x-forwarded-for": forwardedFor },
        });

      assert.equal((await nonce("1.1.1.1")).statusCode, 201);
      assert.equal((await nonce("2.2.2.2")).statusCode, 429);
    });
  });

  it("за доверенным прокси считает каждого клиента отдельно, а заголовок от чужого источника игнорирует", async () => {
    const deps = testDeps(db, { authLimits: limits({ perIp: { nonce: 1 } }) });
    await withApp(deps, { trustProxy: ["10.0.0.5"] }, async (app) => {
      const nonce = (remoteAddress: string, forwardedFor: string) =>
        app.inject({ method: "POST", url: "/v1/auth/nonce", remoteAddress, headers: { "x-forwarded-for": forwardedFor } });

      // Через прокси: разные клиенты — разные счётчики.
      assert.equal((await nonce("10.0.0.5", "203.0.113.1")).statusCode, 201);
      assert.equal((await nonce("10.0.0.5", "203.0.113.2")).statusCode, 201);
      assert.equal((await nonce("10.0.0.5", "203.0.113.1")).statusCode, 429);

      // Мимо прокси: заголовок не учитывается, счётчик по адресу соединения.
      assert.equal((await nonce("198.51.100.9", "203.0.113.3")).statusCode, 201);
      assert.equal((await nonce("198.51.100.9", "203.0.113.4")).statusCode, 429);
    });
  });
});

describe("лимиты, не зависящие от адреса", () => {
  it("бюджет проверок через RPC общий на сервер и не мешает обычным кошелькам", async () => {
    const { chain, calls } = createTestChain("rejects-signatures");
    const deps = testDeps(db, { chain, authLimits: limits({ rpcVerificationsPerMinute: 1 }) });

    // Бюджет живёт в экземпляре приложения, поэтому все запросы идут в одно приложение.
    await withApp(deps, {}, async (app) => {
      const send = (body: { message: string; signature: string }) =>
        app.inject({ method: "POST", url: "/v1/auth/verify", payload: body });
      const other = privateKeyToAccount(generatePrivateKey());

      const first = await signedSignIn(db);
      const rejected = await send({ message: first.message, signature: await other.signMessage({ message: first.message }) });
      assert.equal(rejected.statusCode, 401);

      const second = await signedSignIn(db);
      const busy = await send({ message: second.message, signature: await other.signMessage({ message: second.message }) });
      assert.equal(busy.statusCode, 503);
      assert.equal(errorCode(busy), "AUTH_BUSY");
      assert.deepEqual(calls, ["eth_call"], "вторая проверка не дошла до RPC");

      const own = await signedSignIn(db);
      assert.equal((await send(own)).statusCode, 200, "обычный кошелёк входит при исчерпанном бюджете");
    });
  });
});

describe("проверка Origin", () => {
  it("отклоняет POST с чужим Origin и пропускает свой и запрос без Origin", async () => {
    await withApp(testDeps(db), {}, async (app) => {
      const nonce = (origin?: string) =>
        app.inject({ method: "POST", url: "/v1/auth/nonce", headers: origin ? { origin } : {} });

      const forbidden = await nonce("https://evil.example");
      assert.equal(forbidden.statusCode, 403);
      assert.equal(errorCode(forbidden), "ORIGIN_FORBIDDEN");
      assert.equal(await db.$count(authNonces), 0, "nonce не выдан");

      assert.equal((await nonce(testAppOrigin)).statusCode, 201);
      assert.equal((await nonce()).statusCode, 201);
    });
  });
});

describe("логи", () => {
  it("не содержат cookie, подписи и сообщения входа", async () => {
    const lines: string[] = [];
    const options = { logger: loggerOptions("trace", { write: (line: string) => void lines.push(line) }) };

    await withApp(testDeps(db), options, async (app) => {
      const { nonce } = (await app.inject({ method: "POST", url: "/v1/auth/nonce" })).json<{ nonce: string }>();
      const signer = privateKeyToAccount(generatePrivateKey());
      // signedSignIn запрашивает свой nonce, но overrides подставляет выданный этим приложением.
      const signed = await signedSignIn(db, { nonce }, signer);
      const response = await app.inject({ method: "POST", url: "/v1/auth/verify", payload: signed });
      assert.equal(response.statusCode, 200);
      const sessionId = response.cookies.find((item) => item.name === "openfund_session")?.value ?? "";

      await app.inject({ method: "GET", url: "/v1/auth/session", cookies: { openfund_session: sessionId } });
      await app.inject({ method: "POST", url: "/v1/auth/logout", cookies: { openfund_session: sessionId } });
      await app.inject({ method: "POST", url: "/v1/auth/verify", payload: { message: "hello", signature: "0x00" } });
      // Так выглядела бы ошибка в коде: заголовки и тело запроса залогированы напрямую.
      app.log.info({ headers: { cookie: `openfund_session=${sessionId}` }, body: signed }, "request dump");

      const log = lines.join("");
      assert.ok(log.includes("sign-in rejected"), "логи действительно собраны");
      assert.ok(log.includes("[redacted]"), "redact сработал");
      assert.ok(!log.includes(sessionId), "идентификатор сессии");
      assert.ok(!log.includes(signed.signature.slice(2, 40)), "подпись");
      assert.ok(!log.includes("Sign in to OpenFund"), "текст сообщения");
    });
  });
});
