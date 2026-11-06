import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadEnv } from "./env.ts";

const databaseUrl = "postgres://openfund:secret-password@127.0.0.1:5433/openfund";
const sepoliaRpcUrl = "https://sepolia.example/v3/secret-key";
const required = { DATABASE_URL: databaseUrl, SEPOLIA_RPC_URL: sepoliaRpcUrl };

describe("loadEnv", () => {
  it("подставляет значения по умолчанию", () => {
    assert.deepEqual(loadEnv(required), {
      port: 4000,
      host: "127.0.0.1",
      logLevel: "info",
      databaseUrl,
      sepoliaRpcUrl,
    });
  });

  it("читает переменные из переданного источника", () => {
    assert.deepEqual(loadEnv({ ...required, PORT: "5000", HOST: "0.0.0.0", LOG_LEVEL: "debug" }), {
      port: 5000,
      host: "0.0.0.0",
      logLevel: "debug",
      databaseUrl,
      sepoliaRpcUrl,
    });
  });

  it("отклоняет порт, который не является целым числом 1–65535", () => {
    for (const PORT of ["abc", "0", "70000", "1.5"]) {
      assert.throws(() => loadEnv({ ...required, PORT }), /PORT must be an integer/, PORT);
    }
  });

  it("отклоняет неизвестный уровень логов", () => {
    assert.throws(() => loadEnv({ ...required, LOG_LEVEL: "verbose" }), /LOG_LEVEL must be one of/);
  });

  it("требует строку подключения postgres и не выводит её в ошибку", () => {
    for (const DATABASE_URL of [undefined, "", "mysql://openfund:secret-password@db/openfund"]) {
      assert.throws(
        () => loadEnv({ ...required, DATABASE_URL }),
        (error: Error) => error.message.startsWith("DATABASE_URL must be") && !error.message.includes("secret-password"),
      );
    }
  });

  it("требует http(s) URL узла Sepolia и не выводит его в ошибку", () => {
    for (const SEPOLIA_RPC_URL of [undefined, "", "ftp://sepolia.example/v3/secret-key", "sepolia.example/v3/secret-key"]) {
      assert.throws(
        () => loadEnv({ ...required, SEPOLIA_RPC_URL }),
        (error: Error) => error.message.startsWith("SEPOLIA_RPC_URL must be") && !error.message.includes("secret-key"),
      );
    }
  });
});
