import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { AuthApiError, authApi } from "./authApi.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// Подменяет fetch: запоминает запросы и отвечает заданными статусом и телом.
function mockFetch(status: number, body?: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (url, init = {}) => {
    calls.push({ url: String(url), init });
    const payload = body === undefined ? null : JSON.stringify(body);
    return Promise.resolve(new Response(payload, { status }));
  };
  return calls;
}

describe("authApi", () => {
  it("ходит на относительный /api/v1/auth своего источника и отправляет cookie", async () => {
    const calls = mockFetch(201, { nonce: "a".repeat(64) });

    assert.equal(await authApi.nonce(), "a".repeat(64));
    assert.equal(calls[0]?.url, "/api/v1/auth/nonce");
    assert.equal(calls[0]?.init.method, "POST");
    assert.equal(calls[0]?.init.credentials, "same-origin");
  });

  it("отправляет сообщение и подпись в JSON", async () => {
    const calls = mockFetch(200, { address: "0x1", expiresAt: "2026-11-19T00:00:00.000Z" });

    await authApi.verify("message", "0xabc");

    assert.equal(calls[0]?.url, "/api/v1/auth/verify");
    assert.deepEqual(JSON.parse(String(calls[0]?.init.body)), { message: "message", signature: "0xabc" });
  });

  it("считает 401 на /session отсутствием входа, а не ошибкой", async () => {
    mockFetch(401, { error: { code: "UNAUTHORIZED", message: "Sign-in required" } });

    assert.equal(await authApi.session(), null);
  });

  it("превращает ответ с ошибкой в AuthApiError с кодом backend", async () => {
    mockFetch(429, { error: { code: "RATE_LIMITED", message: "Rate limit exceeded" } });

    await assert.rejects(authApi.nonce(), (error) => error instanceof AuthApiError && error.code === "RATE_LIMITED");
  });

  it("отличает недоступный сервер: status 0 и NETWORK_ERROR", async () => {
    globalThis.fetch = () => Promise.reject(new TypeError("fetch failed"));

    await assert.rejects(authApi.session(), (error) => error instanceof AuthApiError && error.status === 0);
  });

  it("выход отвечает 204 без тела", async () => {
    mockFetch(204);

    assert.equal(await authApi.logout(), undefined);
  });
});
