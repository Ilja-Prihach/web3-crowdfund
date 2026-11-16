import { type Static, Type } from "typebox";

import { fundingModes } from "../../db/schema.ts";
import { ApiErrorSchema } from "../../shared/errors.ts";
import { activityTypes } from "./activity.ts";
import { campaignStatuses, catalogSorts } from "./repository.ts";

// uint256 в десятичной записи: в JSON нет bigint, а Number теряет точность после 2^53 wei (~0,009 ETH).
const Uint = Type.String({ pattern: "^(0|[1-9][0-9]{0,77})$" });
const Address = Type.String({ pattern: "^0x[0-9a-f]{40}$" });

export const CampaignSchema = Type.Object({
  id: Uint,
  creator: Address,
  fundingMode: Type.Enum(fundingModes),
  title: Type.String(),
  description: Type.String(),
  goal: Uint,
  // Unix-время окончания в секундах; null — сбор без срока.
  deadline: Type.Union([Uint, Type.Null()]),
  totalRaised: Uint,
  status: Type.Enum(campaignStatuses),
  createdBlock: Uint,
  // Участники: адреса с текущим вкладом больше нуля.
  donors: Type.Integer({ minimum: 0 }),
});
export type CampaignJson = Static<typeof CampaignSchema>;

// Последний finalized-блок, до которого применены события; null — indexer ещё не запускался.
const FinalizedBlock = Type.Union([Uint, Type.Null()]);
const campaignParams = Type.Object({ id: Uint });
const Limit = Type.Integer({ minimum: 1, maximum: 50, default: 20 });
// Потолок: глубокий OFFSET заставляет базу перебрать и выбросить все строки до него.
const Offset = Type.Integer({ minimum: 0, maximum: 10_000, default: 0 });

export const listCampaignsSchema = {
  querystring: Type.Object({
    q: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    // Повторяемый параметр: ?status=successful&status=failed. Одно значение Fastify превращает в массив сам.
    status: Type.Optional(Type.Array(Type.Enum(campaignStatuses), { maxItems: campaignStatuses.length })),
    mode: Type.Optional(Type.Enum(fundingModes)),
    sort: Type.Optional(Type.Enum(catalogSorts, { default: "newest" })),
    limit: Type.Optional(Limit),
    offset: Type.Optional(Offset),
  }),
  response: {
    200: Type.Object({
      items: Type.Array(CampaignSchema),
      total: Type.Integer({ minimum: 0 }),
      limit: Type.Integer(),
      offset: Type.Integer(),
      finalizedBlock: FinalizedBlock,
    }),
  },
};

export const getCampaignSchema = {
  params: campaignParams,
  response: {
    200: Type.Object({ campaign: CampaignSchema, finalizedBlock: FinalizedBlock }),
    404: ApiErrorSchema,
  },
};

// Курсор ленты «блок-лог»: события строго раньше этой позиции. Длина чисел ограничена, чтобы
// не выйти за bigint блока и integer номера лога в PostgreSQL.
export const cursorPattern = "^(0|[1-9][0-9]{0,17})-(0|[1-9][0-9]{0,8})$";

export const ActivityItemSchema = Type.Object({
  type: Type.Enum(activityTypes),
  // Донатер у вклада и возврата, создатель у остальных событий.
  actor: Type.Union([Address, Type.Null()]),
  // Сумма в wei у вклада, возврата и вывода; null у остальных.
  amount: Type.Union([Uint, Type.Null()]),
  // Срок у создания и смены срока; null у остальных и у сбора без срока.
  deadline: Type.Union([Uint, Type.Null()]),
  blockNumber: Uint,
  // Время блока в ISO 8601; null — событие записано до миграции и время ещё не дочитано.
  blockTimestamp: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  txHash: Type.String({ pattern: "^0x[0-9a-f]{64}$" }),
  logIndex: Type.Integer({ minimum: 0 }),
});
export type ActivityItemJson = Static<typeof ActivityItemSchema>;

export const listActivitySchema = {
  params: campaignParams,
  querystring: Type.Object({
    limit: Type.Optional(Limit),
    before: Type.Optional(Type.String({ pattern: cursorPattern })),
  }),
  response: {
    200: Type.Object({
      items: Type.Array(ActivityItemSchema),
      // Курсор следующей страницы; null — дальше событий нет.
      nextCursor: Type.Union([Type.String({ pattern: cursorPattern }), Type.Null()]),
      finalizedBlock: FinalizedBlock,
    }),
    404: ApiErrorSchema,
  },
};

export const DonorSchema = Type.Object({
  donor: Address,
  // Текущий вклад, как contributions() контракта; donated − refunded = amount.
  amount: Uint,
  donated: Uint,
  refunded: Uint,
  donations: Type.Integer({ minimum: 1 }),
});
export type DonorJson = Static<typeof DonorSchema>;

export const listDonorsSchema = {
  params: campaignParams,
  querystring: Type.Object({
    limit: Type.Optional(Limit),
    offset: Type.Optional(Offset),
  }),
  response: {
    200: Type.Object({
      items: Type.Array(DonorSchema),
      total: Type.Integer({ minimum: 0 }),
      limit: Type.Integer(),
      offset: Type.Integer(),
      finalizedBlock: FinalizedBlock,
    }),
    404: ApiErrorSchema,
  },
};
