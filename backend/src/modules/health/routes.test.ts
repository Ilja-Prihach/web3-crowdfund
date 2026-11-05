import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { sql } from "drizzle-orm";

import { buildApp } from "../../app.ts";
import type { ApiError } from "../../shared/errors.ts";
import { createTestDatabase } from "../../test/database.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());

describe("маршруты здоровья", () => {
  it("GET /health отвечает ok", async () => {
    const app = buildApp({ db });
    const response = await app.inject({ method: "GET", url: "/health" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json<{ status: string }>(), { status: "ok" });
    await app.close();
  });

  it("GET /ready отвечает ready, когда база доступна", async () => {
    const app = buildApp({ db });
    const response = await app.inject({ method: "GET", url: "/ready" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json<{ status: string }>(), { status: "ready" });
    await app.close();
  });

  it("GET /ready отвечает 503 без подробностей, когда база недоступна", async () => {
    const closed = createTestDatabase();
    await closed.pool.end();
    const app = buildApp({ db: closed.db });
    const response = await app.inject({ method: "GET", url: "/ready" });

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.json<ApiError>(), {
      error: { code: "NOT_READY", message: "Database is not reachable" },
    });
    await app.close();
  });

  it("не падает при обрыве простаивающего соединения и снова готов", async () => {
    // Своё имя приложения, чтобы оборвать соединения только этого пула.
    const applicationName = "openfund-ready-reconnect-test";
    const { promise: idleErrorReceived, resolve } = Promise.withResolvers<Error>();
    const victim = createTestDatabase({ applicationName, onIdleError: resolve });
    const app = buildApp({ db: victim.db });
    await app.inject({ method: "GET", url: "/ready" });

    // Так база закрывает соединения при остановке: без слушателя error процесс упал бы.
    await db.execute(sql`select pg_terminate_backend(pid) from pg_stat_activity where application_name = ${applicationName}`);
    // Ждём, пока пул узнает об обрыве и выбросит соединение; запрос до этого мог бы взять мёртвое.
    await idleErrorReceived;
    const response = await app.inject({ method: "GET", url: "/ready" });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json<{ status: string }>(), { status: "ready" });
    await app.close();
    await victim.pool.end();
  });
});
