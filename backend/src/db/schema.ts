import { sql } from "drizzle-orm";
import { bigint, check, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// uint256 из контракта: 78 цифр вмещают 2^256. PostgreSQL bigint (64 бита) переполнился бы на ~9,2 ETH в wei.
const uint256 = (name: string) => numeric(name, { precision: 78, scale: 0, mode: "bigint" });

// Сырые события контракта — журнал, из которого пересобираются проекции.
export const chainEvents = pgTable(
  "chain_events",
  {
    chainId: integer("chain_id").notNull(),
    contractAddress: text("contract_address").notNull(),
    blockNumber: bigint("block_number", { mode: "bigint" }).notNull(),
    txHash: text("tx_hash").notNull(),
    logIndex: integer("log_index").notNull(),
    eventName: text("event_name").notNull(),
    campaignId: uint256("campaign_id").notNull(),
    // Остальные аргументы события; uint256 и адреса хранятся строками: в JSON нет bigint.
    args: jsonb("args").$type<Record<string, string>>().notNull(),
  },
  (table) => [
    // Одно событие в сети определяется транзакцией и номером лога: повтор физически не запишется.
    primaryKey({ columns: [table.chainId, table.txHash, table.logIndex] }),
    // Порядок воспроизведения для проекций: блок, затем лог внутри блока.
    index("chain_events_replay_idx").on(table.chainId, table.contractAddress, table.blockNumber, table.logIndex),
    check("chain_events_chain_id_positive", sql`${table.chainId} > 0`),
    check("chain_events_contract_address_format", sql`${table.contractAddress} ~ '^0x[0-9a-f]{40}$'`),
    check("chain_events_tx_hash_format", sql`${table.txHash} ~ '^0x[0-9a-f]{64}$'`),
    check("chain_events_log_index_non_negative", sql`${table.logIndex} >= 0`),
    check(
      "chain_events_event_name_known",
      sql`${table.eventName} in ('CampaignCreated', 'CampaignDeadlineUpdated', 'DonationMade', 'CampaignCancelled', 'RefundClaimed', 'FundsWithdrawn')`,
    ),
  ],
);

// Последний полностью обработанный finalized-блок для пары «сеть + контракт».
export const indexerCheckpoints = pgTable(
  "indexer_checkpoints",
  {
    chainId: integer("chain_id").notNull(),
    contractAddress: text("contract_address").notNull(),
    lastBlock: bigint("last_block", { mode: "bigint" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.chainId, table.contractAddress] }),
    check("indexer_checkpoints_chain_id_positive", sql`${table.chainId} > 0`),
    check("indexer_checkpoints_contract_address_format", sql`${table.contractAddress} ~ '^0x[0-9a-f]{40}$'`),
    check("indexer_checkpoints_last_block_non_negative", sql`${table.lastBlock} >= 0`),
  ],
);
