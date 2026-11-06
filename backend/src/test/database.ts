import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { createDatabase, type Database } from "../db/client.ts";

// Отдельная БД из compose.yaml: тесты не трогают рабочую openfund.
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "postgres://openfund:openfund@127.0.0.1:5433/openfund_test";
const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

type TestDatabaseOptions = {
  applicationName?: string;
  // По умолчанию обрыв простаивающего соединения в тестах игнорируется: пул сам откроет новое.
  onIdleError?: (error: Error) => void;
};

export function createTestDatabase({
  applicationName = "openfund-backend-test",
  onIdleError = () => {},
}: TestDatabaseOptions = {}) {
  return createDatabase(testDatabaseUrl, { onIdleError, applicationName });
}

// Чистая схема для теста: всё удаляется, миграции применяются заново, как на новой базе.
export async function resetTestDatabase(db: Database) {
  await db.execute(sql`drop schema if exists public cascade`);
  // В схеме drizzle Drizzle помнит применённые миграции: без сброса он посчитал бы их уже выполненными.
  await db.execute(sql`drop schema if exists drizzle cascade`);
  await db.execute(sql`create schema public`);
  await migrate(db, { migrationsFolder });
}

// Код ошибки PostgreSQL (23505 — нарушение уникальности, 23514 — CHECK) из ошибки, которую обернул Drizzle.
export function postgresErrorCode(error: unknown): string | undefined {
  for (let current: unknown = error; current instanceof Error; current = current.cause) {
    if ("code" in current && typeof current.code === "string" && /^\d{5}$/.test(current.code)) return current.code;
  }
  return undefined;
}
