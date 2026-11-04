import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadEnv } from "./env.ts";

describe("loadEnv", () => {
  it("подставляет значения по умолчанию", () => {
    assert.deepEqual(loadEnv({}), { port: 4000, host: "127.0.0.1", logLevel: "info" });
  });

  it("читает переменные из переданного источника", () => {
    assert.deepEqual(loadEnv({ PORT: "5000", HOST: "0.0.0.0", LOG_LEVEL: "debug" }), {
      port: 5000,
      host: "0.0.0.0",
      logLevel: "debug",
    });
  });

  it("отклоняет порт, который не является целым числом 1–65535", () => {
    for (const PORT of ["abc", "0", "70000", "1.5"]) {
      assert.throws(() => loadEnv({ PORT }), /PORT must be an integer/, PORT);
    }
  });

  it("отклоняет неизвестный уровень логов", () => {
    assert.throws(() => loadEnv({ LOG_LEVEL: "verbose" }), /LOG_LEVEL must be one of/);
  });
});
