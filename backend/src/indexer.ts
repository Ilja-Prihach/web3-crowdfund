import { pino } from "pino";

import { createChainClient } from "./chain/client.ts";
import { crowdfunding } from "./chain/contract.ts";
import { loadEnv } from "./config/env.ts";
import { createDatabase } from "./db/client.ts";
import { indexNextBatch } from "./indexer/batch.ts";
import type { IndexedContract } from "./indexer/events.ts";
import { runIndexerLoop } from "./indexer/loop.ts";
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
const contract: IndexedContract = {
  chainId: crowdfunding.chain.id,
  address: crowdfunding.address,
  deployBlock: crowdfunding.deployBlock,
};
const batchSize = BigInt(env.indexerBatchSize);

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
  });
} catch (error) {
  log.fatal({ err: error }, "indexer stopped");
  process.exitCode = 1;
} finally {
  await pool.end();
}
