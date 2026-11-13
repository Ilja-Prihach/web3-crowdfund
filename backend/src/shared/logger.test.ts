import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pino } from "pino";
import { HttpRequestError } from "viem";

import { loggerOptions, serializeError } from "./logger.ts";

const url = "https://sepolia.example/v3/secret-key";
const httpError = () =>
  new HttpRequestError({ url, body: { method: "eth_getLogs" }, status: 429, details: "Too Many Requests" });

describe("serializeError", () => {
  it("убирает URL узла из ошибок viem, оставляя тип и короткое сообщение", () => {
    assert.ok(httpError().message.includes("secret-key"), "viem действительно кладёт URL в message");

    const serialized = serializeError(httpError());

    assert.equal(serialized.type, "HttpRequestError");
    assert.equal(serialized.message, "HTTP request failed.");
    assert.equal(serialized.details, "Too Many Requests", "ответ узла остаётся");
    assert.ok(!JSON.stringify(serialized).includes("secret-key"));
  });

  it("обходит цепочку cause: ошибка viem внутри обычной тоже без URL", () => {
    const wrapped = new Error("batch failed", { cause: httpError() });

    const serialized = serializeError(wrapped);

    assert.equal(serialized.message, "batch failed");
    assert.equal(serialized.cause?.type, "HttpRequestError");
    assert.ok(!JSON.stringify(serialized).includes("secret-key"));
  });

  it("логгер с loggerOptions не пишет URL ни для err, ни для error", () => {
    const lines: string[] = [];
    // Fastify принимает поток полем stream, а голый pino — вторым аргументом.
    const { stream, ...options } = loggerOptions("info", { write: (line: string) => void lines.push(line) });
    const log = pino(options, stream);

    log.error(httpError(), "rpc failed");
    log.warn({ error: httpError() }, "rpc failed again");

    assert.equal(lines.length, 2);
    assert.ok(!lines.join("").includes("secret-key"));
  });
});
