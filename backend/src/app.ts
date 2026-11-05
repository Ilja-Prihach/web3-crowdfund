import Fastify, { type FastifyServerOptions } from "fastify";

import type { Database } from "./db/client.ts";
import { healthRoutes } from "./modules/health/routes.ts";
import { registerErrorHandlers } from "./shared/errors.ts";

// Внешние ресурсы передаются сюда, а не импортируются глобально: тест подставляет тестовую базу.
export type AppDeps = { db: Database };

// Сборка приложения отдельно от запуска: тест создаёт app и шлёт запросы через inject без порта.
export function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  const app = Fastify(options);
  registerErrorHandlers(app);
  void app.register(healthRoutes, deps);

  return app;
}
