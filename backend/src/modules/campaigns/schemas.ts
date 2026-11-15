import { type Static, Type } from "typebox";

import { fundingModes } from "../../db/schema.ts";
import { ApiErrorSchema } from "../../shared/errors.ts";
import { campaignStatuses, catalogSorts } from "./repository.ts";

// uint256 в десятичной записи: в JSON нет bigint, а Number теряет точность после 2^53 wei (~0,009 ETH).
const Uint = Type.String({ pattern: "^(0|[1-9][0-9]{0,77})$" });

export const CampaignSchema = Type.Object({
  id: Uint,
  creator: Type.String({ pattern: "^0x[0-9a-f]{40}$" }),
  fundingMode: Type.Enum(fundingModes),
  title: Type.String(),
  description: Type.String(),
  goal: Uint,
  // Unix-время окончания в секундах; null — сбор без срока.
  deadline: Type.Union([Uint, Type.Null()]),
  totalRaised: Uint,
  status: Type.Enum(campaignStatuses),
  createdBlock: Uint,
});
export type CampaignJson = Static<typeof CampaignSchema>;

// Последний finalized-блок, до которого применены события; null — indexer ещё не запускался.
const FinalizedBlock = Type.Union([Uint, Type.Null()]);

export const listCampaignsSchema = {
  querystring: Type.Object({
    q: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    // Повторяемый параметр: ?status=successful&status=failed. Одно значение Fastify превращает в массив сам.
    status: Type.Optional(Type.Array(Type.Enum(campaignStatuses), { maxItems: campaignStatuses.length })),
    mode: Type.Optional(Type.Enum(fundingModes)),
    sort: Type.Optional(Type.Enum(catalogSorts, { default: "newest" })),
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
    // Потолок: глубокий OFFSET заставляет базу перебрать и выбросить все строки до него.
    offset: Type.Optional(Type.Integer({ minimum: 0, maximum: 10_000, default: 0 })),
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
  params: Type.Object({ id: Uint }),
  response: {
    200: Type.Object({ campaign: CampaignSchema, finalizedBlock: FinalizedBlock }),
    404: ApiErrorSchema,
  },
};
