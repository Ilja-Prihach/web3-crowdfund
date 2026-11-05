import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

import type { Database } from "../../db/client.ts";
import type { ApiError } from "../../shared/errors.ts";

export function healthRoutes(app: FastifyInstance, { db }: { db: Database }) {
  // Жив ли процесс. БД не трогает: при упавшей базе перезапуск сервера не поможет.
  app.get("/health", () => ({ status: "ok" }));

  // Готов ли обслуживать запросы. 503 говорит оркестратору не слать трафик, пока база недоступна.
  app.get("/ready", async (request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { status: "ready" };
    } catch (error) {
      request.log.warn(error, "database is not reachable");
      const body: ApiError = { error: { code: "NOT_READY", message: "Database is not reachable" } };
      return reply.code(503).send(body);
    }
  });
}
