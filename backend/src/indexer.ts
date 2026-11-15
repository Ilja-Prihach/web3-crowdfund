import { pino } from "pino";

import { createChainClient } from "./chain/client.ts";
import { loadEnv } from "./config/env.ts";
import { createDatabase } from "./db/client.ts";
import { indexNextBatch } from "./indexer/batch.ts";
import { sepoliaCrowdfunding } from "./indexer/events.ts";
import { runIndexerLoop } from "./indexer/loop.ts";
import { createReconciler, reconcileProjections } from "./indexer/reconcile.ts";
import { checkNode } from "./indexer/startup.ts";
import { loggerOptions } from "./shared/logger.ts";

// Второй процесс backend: читает finalized-логи V2 и пишет их в chain_events. API (server.ts) работает отдельно.
const env = loadEnv();
const log = pino(loggerOptions(env.logLevel)).child({ process: "indexer" });
const { db, pool } = createDatabase(env.databaseUrl, {
  applicationName: "openfund-indexer",
  onIdleError: (error) => log.warn({ err: error }, "idle database connection failed"),
});
const chain = createChainClient(env.sepoliaRpcUrl);
const contract = sepoliaCrowdfunding;
const batchSize = BigInt(env.indexerBatchSize);
// Сверка с контрактом: при первом догоне finalized и затем раз в час — около десятка eth_call за раз.
const reconcile = createReconciler({
  reconcile: () => reconcileProjections({ db, chain, contract }),
  log,
  intervalMs: 3_600_000,
});

// SIGINT/SIGTERM: текущая пачка дописывается, ожидание прерывается, пул закрывается.
const stop = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    log.info({ signal }, "shutting down");
    stop.abort();
  });
}

try {
  await checkNode(chain, contract, batchSize);
  log.info(
    { contract: contract.address, deployBlock: contract.deployBlock.toString(), batchSize: env.indexerBatchSize },
    "indexer started",
  );
  await runIndexerLoop({
    indexBatch: () => indexNextBatch({ db, chain, contract, batchSize }),
    log,
    signal: stop.signal,
    pollIntervalMs: env.indexerPollIntervalMs,
    onIdle: reconcile,
  });
} catch (error) {
  log.fatal({ err: error }, "indexer stopped");
  process.exitCode = 1;
} finally {
  await pool.end();
}
