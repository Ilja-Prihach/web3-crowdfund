import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BatchResult } from "./batch.ts";
import { backoffMs, runIndexerLoop } from "./loop.ts";

const indexed = (fromBlock: bigint, toBlock: bigint): BatchResult => ({
  status: "indexed",
  fromBlock,
  toBlock,
  events: 1,
  finalized: 100n,
});
const idle: BatchResult = { status: "idle", finalized: 100n };
const rateLimited = () => Object.assign(new Error("Too Many Requests"), { code: -32029 });

// Прогоняет цикл по сценарию: каждая пачка — результат или ошибка; после сценария цикл останавливается.
async function run(script: (BatchResult | Error)[]) {
  const stop = new AbortController();
  const sleeps: number[] = [];
  const warnings: object[] = [];
  let step = 0;

  await runIndexerLoop({
    indexBatch: () => {
      const next = script[step++];
      if (step >= script.length) stop.abort();
      return next instanceof Error ? Promise.reject(next) : Promise.resolve(next ?? idle);
    },
    log: { info: () => {}, warn: (fields) => void warnings.push(fields) },
    signal: stop.signal,
    pollIntervalMs: 12_000,
    catchUpDelayMs: 1_000,
    sleep: (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    },
  });

  return { sleeps, warnings };
}

describe("runIndexerLoop", () => {
  it("догружает пачки с короткой паузой, а догнав finalized, ждёт интервал опроса", async () => {
    const { sleeps } = await run([indexed(1n, 50n), indexed(51n, 100n), idle]);

    assert.deepEqual(sleeps, [1_000, 1_000, 12_000]);
  });

  it("после ошибки не падает, а повторяет с растущей паузой и сбрасывает её после успеха", async () => {
    const { sleeps, warnings } = await run([rateLimited(), rateLimited(), rateLimited(), indexed(1n, 50n), rateLimited()]);

    assert.deepEqual(sleeps, [1_000, 2_000, 4_000, 1_000, 1_000]);
    assert.equal(warnings.length, 4);
  });

  it("сразу выходит, если остановка пришла до первой пачки", async () => {
    const stop = new AbortController();
    stop.abort();
    let calls = 0;

    await runIndexerLoop({
      indexBatch: () => {
        calls++;
        return Promise.resolve(idle);
      },
      log: { info: () => {}, warn: () => {} },
      signal: stop.signal,
      pollIntervalMs: 12_000,
    });

    assert.equal(calls, 0);
  });

  it("ограничивает паузу минутой", () => {
    assert.deepEqual([1, 2, 3, 6, 7, 20].map(backoffMs), [1_000, 2_000, 4_000, 32_000, 60_000, 60_000]);
  });
});
