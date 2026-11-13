import { setTimeout as delay } from "node:timers/promises";

import type { BatchResult } from "./batch.ts";

type Log = { info: (fields: object, message: string) => void; warn: (fields: object, message: string) => void };

export type LoopOptions = {
  indexBatch: () => Promise<BatchResult>;
  log: Log;
  signal: AbortSignal;
  // Когда indexer догнал finalized: ждать следующих блоков.
  pollIntervalMs: number;
  // Между пачками догрузки: не засыпать публичный узел запросами подряд.
  catchUpDelayMs?: number;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
};

// Пауза после n-й ошибки подряд: 1, 2, 4… секунды, не больше минуты.
export const backoffMs = (failures: number) => Math.min(1_000 * 2 ** (failures - 1), 60_000);

// Остановка сигналом прерывает ожидание сразу, а не после него.
const abortableSleep = (ms: number, signal: AbortSignal) => delay(ms, undefined, { signal }).catch(() => undefined);

// Цикл indexer: пачка за пачкой до finalized, потом опрос раз в pollIntervalMs.
// Ошибка (например, -32029 от 1rpc) не роняет процесс: checkpoint на месте, пачка повторится после паузы.
export async function runIndexerLoop({
  indexBatch,
  log,
  signal,
  pollIntervalMs,
  catchUpDelayMs = 1_000,
  sleep = abortableSleep,
}: LoopOptions) {
  let failures = 0;

  while (!signal.aborted) {
    try {
      const result = await indexBatch();
      failures = 0;
      if (result.status === "indexed") {
        log.info(
          {
            fromBlock: result.fromBlock.toString(),
            toBlock: result.toBlock.toString(),
            events: result.events,
            blocksBehind: (result.finalized - result.toBlock).toString(),
          },
          "indexed batch",
        );
        await sleep(catchUpDelayMs, signal);
      } else {
        await sleep(pollIntervalMs, signal);
      }
    } catch (error) {
      failures += 1;
      const retryInMs = backoffMs(failures);
      log.warn({ err: error, failures, retryInMs }, "indexer batch failed");
      await sleep(retryInMs, signal);
    }
  }
}
