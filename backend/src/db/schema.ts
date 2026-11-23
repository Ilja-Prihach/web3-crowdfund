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
    // Время блока для ленты активности. null — событие записано до миграции 0003 и ещё не дочитано
    // командой indexer:rebuild.
    blockTimestamp: timestamp("block_timestamp", { withTimezone: true }),
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
    // Лента одной кампании от новых к старым: фильтр по кампании и тот же порядок без сортировки в памяти.
    index("chain_events_campaign_idx").on(
      table.chainId,
      table.contractAddress,
      table.campaignId,
      table.blockNumber,
      table.logIndex,
    ),
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

// MVP: один профиль на подтверждённый SIWE-адрес. PK исключает дубликаты даже при одновременных запросах.
// Профиль не является проекцией и не удаляется при indexer:rebuild.
export const profiles = pgTable(
  "profiles",
  {
    address: text("address").primaryKey(),
    name: text("name"),
    bio: text("bio"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("profiles_address_format", sql`${table.address} ~ '^0x[0-9a-f]{40}$'`),
    check("profiles_name_length", sql`${table.name} is null or (length(trim(${table.name})) > 0 and length(${table.name}) <= 80)`),
    check("profiles_bio_length", sql`${table.bio} is null or (length(trim(${table.bio})) > 0 and length(${table.bio}) <= 1000)`),
  ],
);

// Категории кампаний из product-vision.md: в контракте их нет, выбирает создатель.
export const campaignCategories = ["open_source", "education", "creative", "apps", "community"] as const;

// Границы текстов создателя. Схема API проверяет ещё и форму строк бюджета и плана, база — типы, число строк и длины.
export const campaignDetailsLimits = { story: 10_000, risks: 2_000, budgetRows: 12, planSteps: 12 } as const;
const { story: maxStory, risks: maxRisks, budgetRows: maxBudgetRows, planSteps: maxPlanSteps } = campaignDetailsLimits;
// Число в текст CHECK: параметры запроса в DDL не допускаются.
const literal = (value: number) => sql.raw(String(value));
// CHECK «null или массив JSON из 1..max элементов». CASE, а не AND: PostgreSQL не обещает порядок вычисления условий,
// и jsonb_array_length на объекте бросила бы ошибку вместо нарушения CHECK. Null пропускается явно:
// иначе его поймала бы ветка else.
const jsonArrayOfLength = (column: AnyPgColumn, max: number) =>
  sql`case when ${column} is null then true when jsonb_typeof(${column}) = 'array' then jsonb_array_length(${column}) between 1 and ${literal(max)} else false end`;

// Обложка и расширенное описание от создателя кампании. Это данные пользователей, а не проекция:
// из событий их не восстановить, поэтому пересборка их не трогает и им нужны бэкапы.
// Внешнего ключа на campaigns нет: создатель может заполнить описание раньше, чем indexer дочитает кампанию.
export const campaignDetails = pgTable(
  "campaign_details",
  {
    chainId: integer("chain_id").notNull(),
    contractAddress: text("contract_address").notNull(),
    campaignId: uint256("campaign_id").notNull(),
    category: text("category", { enum: campaignCategories }),
    story: text("story"),
    // [{ label, amount }] — amount в wei десятичной строкой, как суммы в API.
    budget: jsonb("budget").$type<{ label: string; amount: string }[]>(),
    // [{ period, task }] — этапы в порядке выполнения.
    plan: jsonb("plan").$type<{ period: string; task: string }[]>(),
    risks: text("risks"),
    // Ключ файла в MediaStorage: sha256 пережатого WebP, поэтому путь нельзя подобрать.
    coverKey: text("cover_key"),
    updatedBy: text("updated_by").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.chainId, table.contractAddress, table.campaignId] }),
    // Фильтр каталога по категории.
    index("campaign_details_category_idx").on(table.chainId, table.contractAddress, table.category),
    check("campaign_details_chain_id_positive", sql`${table.chainId} > 0`),
    check("campaign_details_contract_address_format", sql`${table.contractAddress} ~ '^0x[0-9a-f]{40}$'`),
    // ID кампаний V2 начинаются с 0: nextCampaignId в контракте стартует с нуля.
    check("campaign_details_campaign_id_non_negative", sql`${table.campaignId} >= 0`),
    check("campaign_details_category_known", oneOf(table.category, campaignCategories)),
    // Пустой текст и пустой список хранятся как null: у «не заполнено» одно представление.
    check("campaign_details_story_length", sql`char_length(${table.story}) between 1 and ${literal(maxStory)}`),
    check("campaign_details_risks_length", sql`char_length(${table.risks}) between 1 and ${literal(maxRisks)}`),
    check(
      "campaign_details_budget_rows",
      jsonArrayOfLength(table.budget, maxBudgetRows),
    ),
    check(
      "campaign_details_plan_steps",
      jsonArrayOfLength(table.plan, maxPlanSteps),
    ),
    check("campaign_details_cover_key_format", sql`${table.coverKey} ~ '^covers/[0-9a-f]{64}[.]webp$'`),
    check("campaign_details_updated_by_format", sql`${table.updatedBy} ~ '^0x[0-9a-f]{40}$'`),
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
