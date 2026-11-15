import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";

import type { Database } from "../../db/client.ts";
import { sepoliaCrowdfunding } from "../../indexer/events.ts";
import type { ApiError } from "../../shared/errors.ts";
import { findCampaign, listCampaigns } from "./repository.ts";
import { type CampaignJson, getCampaignSchema, listCampaignsSchema } from "./schemas.ts";

type CampaignRow = NonNullable<Awaited<ReturnType<typeof findCampaign>>["campaign"]>;
export type CampaignRoutesDeps = { db: Database; requestsPerMinute: number };

const nowSeconds = () => Math.floor(Date.now() / 1000);

function toJson(row: CampaignRow): CampaignJson {
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
  };
}

// Каталог V2 в Sepolia из проекций indexer. Суммы и действия на странице кампании frontend по-прежнему
// читает из контракта: каталог отстаёт на время финализации и не источник финансовой истины.
export const campaignRoutes: FastifyPluginCallbackTypebox<CampaignRoutesDeps> = (app, deps, done) => {
  // Поиск дороже обычного чтения: лимит по адресу клиента.
  const config = { rateLimit: { max: deps.requestsPerMinute, timeWindow: 60_000 } };

  app.get("/", { schema: listCampaignsSchema, config }, async (request) => {
    const { q, status, mode, sort = "newest", limit = 20, offset = 0 } = request.query;
    // Строка из одних пробелов — не поиск.
    const search = q?.trim() || undefined;
    const result = await listCampaigns(deps.db, sepoliaCrowdfunding, {
      q: search,
      statuses: status,
      mode,
      sort,
      limit,
      offset,
      nowSeconds: nowSeconds(),
    });
    return {
      items: result.items.map(toJson),
      total: result.total,
      limit,
      offset,
      finalizedBlock: result.finalizedBlock?.toString() ?? null,
    };
  });

  app.get("/:id", { schema: getCampaignSchema, config }, async (request, reply) => {
    const { campaign, finalizedBlock } = await findCampaign(
      deps.db,
      sepoliaCrowdfunding,
      BigInt(request.params.id),
      nowSeconds(),
    );
    if (!campaign) {
      const body: ApiError = { error: { code: "CAMPAIGN_NOT_FOUND", message: `Campaign ${request.params.id} is not in the catalog` } };
      return reply.code(404).send(body);
    }
    return { campaign: toJson(campaign), finalizedBlock: finalizedBlock?.toString() ?? null };
  });

  done();
};
