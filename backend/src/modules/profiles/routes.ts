import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";

import type { Database } from "../../db/client.ts";
import { sepoliaCrowdfunding } from "../../indexer/events.ts";
import { rejectForeignOrigin } from "../../shared/origin.ts";
import { requireSession } from "../auth/session.ts";
import { listCampaigns } from "../campaigns/repository.ts";
import { campaignToJson } from "../campaigns/routes.ts";
import { findProfile, saveProfile } from "./repository.ts";
import { getProfileSchema, profileCampaignsSchema, putProfileSchema } from "./schemas.ts";

type Profile = NonNullable<Awaited<ReturnType<typeof findProfile>>>;
const toJson = (profile: Profile) => ({
  ...profile,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
});

export const profileRoutes: FastifyPluginCallbackTypebox<{ db: Database; appOrigin: string }> = (app, deps, done) => {
  app.addHook("onRequest", rejectForeignOrigin(deps.appOrigin));
  const reads = { rateLimit: { max: 120, timeWindow: 60_000 } };
  const writes = { rateLimit: { max: 30, timeWindow: 60_000 } };

  // Адрес только из сессии: поле address в теле не может изменить владельца профиля.
  app.put("/me", { schema: putProfileSchema, config: writes, preHandler: requireSession(deps.db) }, async (request, reply) => {
    if (!request.session) throw new Error("Session was not loaded");
    void reply.header("cache-control", "no-store");
    return toJson(await saveProfile(deps.db, request.session.address, request.body));
  });

  app.get("/:address", { schema: getProfileSchema, config: reads }, async (request, reply) => {
    const profile = await findProfile(deps.db, request.params.address);
    if (!profile) return reply.code(404).send({ error: { code: "PROFILE_NOT_FOUND", message: "Profile has not been created" } });
    return toJson(profile);
  });

  // История публичного адреса доступна и до заполнения off-chain-профиля.
  for (const kind of ["created", "supported"] as const) {
    app.get(`/:address/campaigns/${kind}`, { schema: profileCampaignsSchema, config: reads }, async (request) => {
      const { limit = 20, offset = 0 } = request.query;
      const address = request.params.address.toLowerCase();
      const result = await listCampaigns(deps.db, sepoliaCrowdfunding, {
        limit, offset, sort: "newest", nowSeconds: Math.floor(Date.now() / 1000),
        ...(kind === "created" ? { creator: address } : { supporter: address }),
      });
      return {
        items: result.items.map(campaignToJson), total: result.total, limit, offset,
        finalizedBlock: result.finalizedBlock?.toString() ?? null,
      };
    });
  }
  done();
};
