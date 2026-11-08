import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { buildApp } from "../app.ts";
import { testDeps } from "../test/app.ts";
import { createTestDatabase } from "../test/database.ts";
import type { ApiError } from "./errors.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());

// Приложение с маршрутами, которые нарочно бросают ошибки разных видов.
function appWithFailingRoutes() {
  const app = buildApp(testDeps(db));
  app.get("/conflict", () => {
    throw Object.assign(new Error("Nonce already used"), { statusCode: 409, code: "NONCE_USED" });
  });
  app.get("/crash", () => {
    throw new Error("SELECT * FROM secrets");
  });
  return app;
}

describe("обработчики ошибок", () => {
  it("отвечает 404 NOT_FOUND на неизвестный маршрут", async () => {
    const app = appWithFailingRoutes();
    const response = await app.inject({ method: "GET", url: "/nope" });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json<ApiError>().error.code, "NOT_FOUND");
    await app.close();
  });

  it("передаёт клиенту статус и код ошибки 4xx", async () => {
    const app = appWithFailingRoutes();
    const response = await app.inject({ method: "GET", url: "/conflict" });

    assert.equal(response.statusCode, 409);
    assert.deepEqual(response.json<ApiError>(), { error: { code: "NONCE_USED", message: "Nonce already used" } });
    await app.close();
  });

  it("скрывает текст внутренней ошибки", async () => {
    const app = appWithFailingRoutes();
    const response = await app.inject({ method: "GET", url: "/crash" });

    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.json<ApiError>(), { error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    assert.doesNotMatch(response.body, /secrets/);
    await app.close();
  });
});
