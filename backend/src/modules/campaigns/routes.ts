import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";
import type { FastifyReply } from "fastify";

import type { Database } from "../../db/client.ts";
import { sepoliaCrowdfunding } from "../../indexer/events.ts";
import type { ApiError } from "../../shared/errors.ts";
import { type EventPosition, listActivity, listDonors, toActivityItem } from "./activity.ts";
import { coverUrl } from "./details.ts";
import { findCampaign, listCampaigns } from "./repository.ts";
import {
  type ActivityItemJson,
  type CampaignJson,
  getCampaignSchema,
  listActivitySchema,
  listCampaignsSchema,
  listDonorsSchema,
} from "./schemas.ts";

type CampaignRow = NonNullable<Awaited<ReturnType<typeof findCampaign>>["campaign"]>;
export type CampaignRoutesDeps = { db: Database; requestsPerMinute: number };

const nowSeconds = () => Math.floor(Date.now() / 1000);

export function campaignToJson(row: CampaignRow): CampaignJson {
  return {
    id: row.campaignId.toString(),
    creator: row.creator,
    fundingMode: row.fundingMode,
    title: row.title,
    description: row.description,
    goal: row.goal.toString(),
    deadline: row.fundingMode === "open_ended" ? null : row.deadline.toString(),
    totalRaised: row.totalRaised.toString(),
    status: row.status,
    createdBlock: row.createdBlock.toString(),
    donors: row.donors,
    category: row.category,
    coverUrl: coverUrl(row.coverKey),
  };
}

function activityToJson(item: ReturnType<typeof toActivityItem>): ActivityItemJson {
  return {
    ...item,
    amount: item.amount?.toString() ?? null,
    deadline: item.deadline?.toString() ?? null,
    blockNumber: item.blockNumber.toString(),
    blockTimestamp: item.blockTimestamp?.toISOString() ?? null,
  };
}

// Курсор «блок-лог»: формат уже проверен схемой, здесь только разбор.
const parseCursor = (cursor: string): EventPosition => {
  const [block = "0", log = "0"] = cursor.split("-");
  return { blockNumber: BigInt(block), logIndex: Number(log) };
};
const formatCursor = ({ blockNumber, logIndex }: EventPosition) => `${blockNumber}-${logIndex}`;

const finalized = (block: bigint | null) => block?.toString() ?? null;

function notFound(reply: FastifyReply, id: string) {
  const body: ApiError = { error: { code: "CAMPAIGN_NOT_FOUND", message: `Campaign ${id} is not in the catalog` } };
  return reply.code(404).send(body);
}

// Каталог V2 в Sepolia из проекций indexer. Суммы и действия на странице кампании frontend по-прежнему
// читает из контракта: каталог отстаёт на время финализации и не источник финансовой истины.
export const campaignRoutes: FastifyPluginCallbackTypebox<CampaignRoutesDeps> = (app, deps, done) => {
  // Поиск дороже обычного чтения: лимит по адресу клиента.
  const config = { rateLimit: { max: deps.requestsPerMinute, timeWindow: 60_000 } };

  app.get("/", { schema: listCampaignsSchema, config }, async (request) => {
    const { q, status, mode, category, sort = "newest", limit = 20, offset = 0 } = request.query;
    // Строка из одних пробелов — не поиск.
    const search = q?.trim() || undefined;
    const result = await listCampaigns(deps.db, sepoliaCrowdfunding, {
      q: search,
      statuses: status,
      mode,
      category,
      sort,
      limit,
      offset,
      nowSeconds: nowSeconds(),
    });
    return {
      items: result.items.map(campaignToJson),
      total: result.total,
      limit,
      offset,
      finalizedBlock: finalized(result.finalizedBlock),
    };
  });

  app.get("/:id", { schema: getCampaignSchema, config }, async (request, reply) => {
    const { campaign, finalizedBlock } = await findCampaign(
      deps.db,
      sepoliaCrowdfunding,
      BigInt(request.params.id),
      nowSeconds(),
    );
    if (!campaign) return notFound(reply, request.params.id);
    return { campaign: campaignToJson(campaign), finalizedBlock: finalized(finalizedBlock) };
  });

  // Лента кампании от новых событий к старым; следующая страница — ?before=<nextCursor>.
  app.get("/:id/activity", { schema: listActivitySchema, config }, async (request, reply) => {
    const { limit = 20, before } = request.query;
    const result = await listActivity(deps.db, sepoliaCrowdfunding, BigInt(request.params.id), {
      limit,
      before: before === undefined ? undefined : parseCursor(before),
    });
    if (!result) return notFound(reply, request.params.id);
    return {
      items: result.items.map(activityToJson),
      nextCursor: result.nextCursor && formatCursor(result.nextCursor),
      finalizedBlock: finalized(result.finalizedBlock),
    };
  });

  // Текущие донатеры по убыванию вклада.
  app.get("/:id/donors", { schema: listDonorsSchema, config }, async (request, reply) => {
    const { limit = 20, offset = 0 } = request.query;
    const result = await listDonors(deps.db, sepoliaCrowdfunding, BigInt(request.params.id), { limit, offset });
    if (!result) return notFound(reply, request.params.id);
    return {
      items: result.items.map((item) => ({
        ...item,
        amount: item.amount.toString(),
        donated: item.donated.toString(),
        refunded: item.refunded.toString(),
      })),
      total: result.total,
      limit,
      offset,
      finalizedBlock: finalized(result.finalizedBlock),
    };
  });

  done();
};
