import { pino } from "pino";

import { createChainClient } from "./chain/client.ts";
import { loadEnv } from "./config/env.ts";
import { createDatabase } from "./db/client.ts";
import { sepoliaCrowdfunding } from "./indexer/events.ts";
import { rebuildProjections } from "./indexer/rebuild.ts";
import { loggerOptions } from "./shared/logger.ts";

// Разовая команда: пересобирает campaigns и contributions из chain_events. Безопасна при работающем indexer.
const env = loadEnv();
const log = pino(loggerOptions(env.logLevel)).child({ process: "rebuild" });
const { db, pool } = createDatabase(env.databaseUrl, {
  applicationName: "openfund-rebuild",
  onIdleError: (error) => log.warn({ err: error }, "idle database connection failed"),
});

try {
  const result = await rebuildProjections({ db, chain: createChainClient(env.sepoliaRpcUrl), contract: sepoliaCrowdfunding });
  log.info(result, "projections rebuilt");
} catch (error) {
  log.fatal({ err: error }, "rebuild failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
