import { sql } from "drizzle-orm";
import { bigint, check, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// uint256 из контракта: 78 цифр вмещают 2^256. PostgreSQL bigint (64 бита) переполнился бы на ~9,2 ETH в wei.
const uint256 = (name: string) => numeric(name, { precision: 78, scale: 0, mode: "bigint" });

// События Crowdfunding V2, которые принимает журнал; тест сверяет список с ABI.
export const crowdfundingEventNames = [
  "CampaignCreated",
  "CampaignDeadlineUpdated",
  "DonationMade",
  "CampaignCancelled",
  "RefundClaimed",
  "FundsWithdrawn",
] as const;

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
      sql`${table.eventName} in (${sql.raw(crowdfundingEventNames.map((name) => `'${name}'`).join(", "))})`,
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

// Одноразовые nonce входа SIWE. Строка удаляется при входе, а просроченные чистятся попутно.
export const authNonces = pgTable(
  "auth_nonces",
  {
    // 32 случайных байта из crypto.randomBytes в hex.
    nonce: text("nonce").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    // Чистка просроченных и подсчёт живых nonce идут по сроку.
    index("auth_nonces_expires_at_idx").on(table.expiresAt),
    check("auth_nonces_nonce_format", sql`${table.nonce} ~ '^[0-9a-f]{64}$'`),
  ],
);

// Серверные сессии. Cookie несёт случайный идентификатор, а база хранит только его SHA-256:
// дамп таблицы не даёт готовых cookie.
export const authSessions = pgTable(
  "auth_sessions",
  {
    idHash: text("id_hash").primaryKey(),
    address: text("address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
    check("auth_sessions_id_hash_format", sql`${table.idHash} ~ '^[0-9a-f]{64}$'`),
    check("auth_sessions_address_format", sql`${table.address} ~ '^0x[0-9a-f]{40}$'`),
    check("auth_sessions_expires_after_created", sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);
