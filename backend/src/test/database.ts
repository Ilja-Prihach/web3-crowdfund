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

// Сброс стирает всю базу, поэтому разрешён только для баз с именем на _test.
export function assertDisposableDatabase(name: string) {
  if (!name.endsWith("_test")) {
    throw new Error(`Refusing to reset database "${name}": test databases must be named *_test`);
  }
}

// Чистая схема для теста: всё удаляется, миграции применяются заново, как на новой базе.
export async function resetTestDatabase(db: Database) {
  // Имя берётся у фактического соединения, а не из URL: его могли подменить параметры строки или PGDATABASE.
  const result = await db.execute<{ name: string }>(sql`select current_database() as name`);
  assertDisposableDatabase(result.rows[0]?.name ?? "");

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
