import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import { pino } from "pino";

import { createChainClient } from "./chain/client.ts";
import { crowdfunding } from "./chain/contract.ts";
import { readCampaignCreator } from "./chain/creator.ts";
import { loadEnv } from "./config/env.ts";
import { createDatabase } from "./db/client.ts";
import { campaignCategories } from "./db/schema.ts";
import { sepoliaCrowdfunding } from "./indexer/events.ts";
import { importCover } from "./media/import-cover.ts";
import { createLocalMediaStorage } from "./media/storage.ts";
import { loggerOptions } from "./shared/logger.ts";

// Разовая команда оператора: npm run media:import-cover -- <campaignId> <file> [--category <slug>].
// Нужна, пока у создателя нет формы загрузки (#62), и для переноса обложек demo-кампаний.
const env = loadEnv();
const log = pino(loggerOptions(env.logLevel)).child({ process: "import-cover" });

const { positionals, values } = parseArgs({ allowPositionals: true, options: { category: { type: "string" } } });
const [id, path] = positionals;
const category = campaignCategories.find((known) => known === values.category);
if (!id || !/^(0|[1-9][0-9]*)$/.test(id) || !path || (values.category !== undefined && !category)) {
  log.fatal(`usage: npm run media:import-cover -- <campaignId> <file> [--category ${campaignCategories.join("|")}]`);
  process.exit(1);
}

const { db, pool } = createDatabase(env.databaseUrl, {
  applicationName: "openfund-import-cover",
  onIdleError: (error) => log.warn({ err: error }, "idle database connection failed"),
});
const chain = createChainClient(env.sepoliaRpcUrl);

try {
  const row = await importCover(
    {
      db,
      media: createLocalMediaStorage(env.mediaDir),
      contract: sepoliaCrowdfunding,
      campaignCreator: (campaignId) => readCampaignCreator(chain, crowdfunding.address, campaignId),
    },
    { campaignId: BigInt(id), file: await readFile(path), category },
  );
  log.info({ campaignId: id, coverKey: row.coverKey, category: row.category }, "cover imported");
} catch (error) {
  log.fatal({ err: error }, "import failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
