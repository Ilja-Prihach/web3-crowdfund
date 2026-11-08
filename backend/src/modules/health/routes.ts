import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";
import { sql } from "drizzle-orm";

import type { Database } from "../../db/client.ts";
import type { ApiError } from "../../shared/errors.ts";
import { healthSchema, readySchema } from "./schemas.ts";

export const healthRoutes: FastifyPluginCallbackTypebox<{ db: Database }> = (app, { db }, done) => {
  // Жив ли процесс. БД не трогает: при упавшей базе перезапуск сервера не поможет.
  app.get("/health", { schema: healthSchema }, () => ({ status: "ok" as const }));

  // Готов ли обслуживать запросы. 503 говорит оркестратору не слать трафик, пока база недоступна.
  app.get("/ready", { schema: readySchema }, async (request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { status: "ready" as const };
    } catch (error) {
      request.log.warn(error, "database is not reachable");
      const body: ApiError = { error: { code: "NOT_READY", message: "Database is not reachable" } };
      return reply.code(503).send(body);
    }
  });

  done();
};
