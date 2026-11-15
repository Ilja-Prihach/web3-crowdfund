import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { buildApp } from "./app.ts";
import { testAppOrigin, testDeps } from "./test/app.ts";
import { createTestDatabase } from "./test/database.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());

describe("безопасные заголовки", () => {
  it("ставит заголовки helmet на обычный ответ и на ошибку", async () => {
    const app = buildApp(testDeps(db));
    try {
      for (const url of ["/health", "/no-such-route"]) {
        const { headers } = await app.inject({ method: "GET", url });
        assert.equal(headers["x-content-type-options"], "nosniff", url);
        assert.equal(headers["x-frame-options"], "SAMEORIGIN", url);
        assert.match(String(headers["content-security-policy"]), /default-src 'self'/, url);
        assert.match(String(headers["strict-transport-security"]), /max-age=\d+/, url);
        assert.equal(headers["x-powered-by"], undefined, url);
      }
    } finally {
      await app.close();
    }
  });

  it("не разрешает запросы с чужих источников: CORS не подключён", async () => {
    const app = buildApp(testDeps(db));
    try {
      const preflight = await app.inject({
        method: "OPTIONS",
        url: "/health",
        headers: { origin: "https://evil.example", "access-control-request-method": "GET" },
      });
      const simple = await app.inject({ method: "GET", url: "/health", headers: { origin: testAppOrigin } });

      assert.equal(preflight.headers["access-control-allow-origin"], undefined);
      assert.equal(simple.headers["access-control-allow-origin"], undefined);
    } finally {
      await app.close();
    }
  });
});
