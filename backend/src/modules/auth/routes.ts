import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";

import type { Database } from "../../db/client.ts";
import { nonceSchema } from "./schemas.ts";
import { issueNonce } from "./service.ts";

export const authRoutes: FastifyPluginCallbackTypebox<{ db: Database }> = (app, { db }, done) => {
  // POST, а не GET: запрос создаёт строку в базе, а GET по правилам HTTP не должен ничего менять.
  app.post("/nonce", { schema: nonceSchema }, async (_request, reply) => {
    const nonce = await issueNonce(db);
    // Nonce одноразовый: ни браузер, ни промежуточный прокси не должны отдавать его из кэша.
    return reply.code(201).header("cache-control", "no-store").send({ nonce });
  });

  done();
};
