import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { sql } from "drizzle-orm";

import { createDatabase } from "../db/client.ts";
import { assertDisposableDatabase, createTestDatabase, resetTestDatabase } from "./database.ts";

describe("assertDisposableDatabase", () => {
  it("разрешает только базы с именем на _test", () => {
    assert.doesNotThrow(() => assertDisposableDatabase("openfund_test"));
    for (const name of ["openfund", "postgres", "openfund_testing", "openfund_test_backup", "test", ""]) {
      assert.throws(() => assertDisposableDatabase(name), /Refusing to reset database/, name);
    }
  });
});

describe("resetTestDatabase", () => {
  const admin = createTestDatabase();
  const guardDatabase = "openfund_reset_guard";
  after(async () => {
    await admin.db.execute(sql.raw(`drop database if exists ${guardDatabase} with (force)`));
    await admin.pool.end();
  });

  it("отказывается стирать базу, имя которой не оканчивается на _test", async () => {
    // Временная «настоящая» база с данными: именно так выглядела бы ошибка в TEST_DATABASE_URL.
    await admin.db.execute(sql.raw(`drop database if exists ${guardDatabase} with (force)`));
    await admin.db.execute(sql.raw(`create database ${guardDatabase}`));
    const url = new URL(process.env.TEST_DATABASE_URL ?? "postgres://openfund:openfund@127.0.0.1:5433/openfund_test");
    url.pathname = `/${guardDatabase}`;
    const victim = createDatabase(url.toString(), { onIdleError: () => {} });

    try {
      await victim.db.execute(sql`create table precious (id int)`);
      await assert.rejects(resetTestDatabase(victim.db), /Refusing to reset database "openfund_reset_guard"/);

      const tables = await victim.db.execute<{ table_name: string }>(
        sql`select table_name from information_schema.tables where table_schema = 'public'`,
      );
      assert.deepEqual(
        tables.rows.map((row) => row.table_name),
        ["precious"],
      );
    } finally {
      await victim.pool.end();
    }
  });
});
