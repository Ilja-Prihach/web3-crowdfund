import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadEnv } from "./env.ts";

const databaseUrl = "postgres://openfund:secret-password@127.0.0.1:5433/openfund";

describe("loadEnv", () => {
  it("подставляет значения по умолчанию", () => {
    assert.deepEqual(loadEnv({ DATABASE_URL: databaseUrl }), {
      port: 4000,
      host: "127.0.0.1",
      logLevel: "info",
      databaseUrl,
    });
  });

  it("читает переменные из переданного источника", () => {
    assert.deepEqual(loadEnv({ PORT: "5000", HOST: "0.0.0.0", LOG_LEVEL: "debug", DATABASE_URL: databaseUrl }), {
      port: 5000,
      host: "0.0.0.0",
      logLevel: "debug",
      databaseUrl,
    });
  });

  it("отклоняет порт, который не является целым числом 1–65535", () => {
    for (const PORT of ["abc", "0", "70000", "1.5"]) {
      assert.throws(() => loadEnv({ PORT, DATABASE_URL: databaseUrl }), /PORT must be an integer/, PORT);
    }
  });

  it("отклоняет неизвестный уровень логов", () => {
    assert.throws(() => loadEnv({ LOG_LEVEL: "verbose", DATABASE_URL: databaseUrl }), /LOG_LEVEL must be one of/);
  });

  it("требует строку подключения postgres и не выводит её в ошибку", () => {
    for (const DATABASE_URL of [undefined, "", "mysql://openfund:secret-password@db/openfund"]) {
      assert.throws(
        () => loadEnv({ DATABASE_URL }),
        (error: Error) => error.message.startsWith("DATABASE_URL must be") && !error.message.includes("secret-password"),
      );
    }
  });
});
