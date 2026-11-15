import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// uint256 из контракта: 78 цифр вмещают 2^256. PostgreSQL bigint (64 бита) переполнился бы на ~9,2 ETH в wei.
const uint256 = (name: string) => numeric(name, { precision: 78, scale: 0, mode: "bigint" });

// CHECK «значение из списка»: SQL строится из того же массива, что и тип TypeScript.
const oneOf = (column: AnyPgColumn, values: readonly string[]) =>
  sql`${column} in (${sql.raw(values.map((value) => `'${value}'`).join(", "))})`;

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
    check("chain_events_event_name_known", oneOf(table.eventName, crowdfundingEventNames)),
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

// Режимы сбора V2 в порядке enum FundingMode контракта: индекс в массиве — значение из ABI.
export const fundingModes = ["fixed_deadline", "open_ended"] as const;

// Название, описание и режим сбора из getCampaigns: в CampaignCreated их нет, а в V2 они неизменяемы.
// Это сырые данные сети, как chain_events, поэтому пересборка проекций их не трогает.
export const campaignMetadata = pgTable(
  "campaign_metadata",
  {
    chainId: integer("chain_id").notNull(),
    contractAddress: text("contract_address").notNull(),
    campaignId: uint256("campaign_id").notNull(),
    fundingMode: text("funding_mode", { enum: fundingModes }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.chainId, table.contractAddress, table.campaignId] }),
    check("campaign_metadata_chain_id_positive", sql`${table.chainId} > 0`),
    check("campaign_metadata_contract_address_format", sql`${table.contractAddress} ~ '^0x[0-9a-f]{40}$'`),
    check("campaign_metadata_funding_mode_known", oneOf(table.fundingMode, fundingModes)),
    // Границы контракта: MAX_TITLE_LENGTH и MAX_DESCRIPTION_LENGTH считаются в байтах UTF-8.
    check("campaign_metadata_title_length", sql`octet_length(${table.title}) between 1 and 100`),
    check("campaign_metadata_description_length", sql`octet_length(${table.description}) between 1 and 1000`),
  ],
);

// Проекция кампании — текущее состояние, выведенное из chain_events. Статус не хранится:
// Active и Failed зависят от текущего времени, его вычисляет API по правилам контракта.
export const campaigns = pgTable(
  "campaigns",
  {
    chainId: integer("chain_id").notNull(),
    contractAddress: text("contract_address").notNull(),
    campaignId: uint256("campaign_id").notNull(),
    creator: text("creator").notNull(),
    goal: uint256("goal").notNull(),
    // Unix-время окончания; 0 — сбор без срока, как в контракте.
    deadline: uint256("deadline").notNull(),
    totalRaised: uint256("total_raised").notNull(),
    cancelled: boolean("cancelled").notNull(),
    fundsWithdrawn: boolean("funds_withdrawn").notNull(),
    createdBlock: bigint("created_block", { mode: "bigint" }).notNull(),
    updatedBlock: bigint("updated_block", { mode: "bigint" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.chainId, table.contractAddress, table.campaignId] }),
    // Кампания без метаданных в проекцию не попадает: indexer дочитывает их до применения CampaignCreated.
    foreignKey({
      name: "campaigns_metadata_fk",
      columns: [table.chainId, table.contractAddress, table.campaignId],
      foreignColumns: [campaignMetadata.chainId, campaignMetadata.contractAddress, campaignMetadata.campaignId],
    }),
    check("campaigns_creator_format", sql`${table.creator} ~ '^0x[0-9a-f]{40}$'`),
    check("campaigns_goal_positive", sql`${table.goal} > 0`),
    check("campaigns_deadline_non_negative", sql`${table.deadline} >= 0`),
    check("campaigns_total_raised_non_negative", sql`${table.totalRaised} >= 0`),
    check("campaigns_updated_after_created", sql`${table.updatedBlock} >= ${table.createdBlock}`),
  ],
);

// Текущий вклад донатера, как contributions[campaignId][donor] в контракте: после возврата — 0.
export const contributions = pgTable(
  "contributions",
  {
    chainId: integer("chain_id").notNull(),
    contractAddress: text("contract_address").notNull(),
    campaignId: uint256("campaign_id").notNull(),
    donor: text("donor").notNull(),
    amount: uint256("amount").notNull(),
    updatedBlock: bigint("updated_block", { mode: "bigint" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.chainId, table.contractAddress, table.campaignId, table.donor] }),
    // Пересборка удаляет кампании вместе с вкладами.
    foreignKey({
      name: "contributions_campaign_fk",
      columns: [table.chainId, table.contractAddress, table.campaignId],
      foreignColumns: [campaigns.chainId, campaigns.contractAddress, campaigns.campaignId],
    }).onDelete("cascade"),
    // Вклады одного донатера по всем кампаниям — для будущего профиля.
    index("contributions_donor_idx").on(table.chainId, table.contractAddress, table.donor),
    check("contributions_donor_format", sql`${table.donor} ~ '^0x[0-9a-f]{40}$'`),
    check("contributions_amount_non_negative", sql`${table.amount} >= 0`),
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
