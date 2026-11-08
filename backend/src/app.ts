import fastifyCookie from "@fastify/cookie";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify, { type FastifyServerOptions } from "fastify";

import type { ChainClient } from "./chain/client.ts";
import type { Database } from "./db/client.ts";
import { authRoutes } from "./modules/auth/routes.ts";
import { healthRoutes } from "./modules/health/routes.ts";
import { registerErrorHandlers } from "./shared/errors.ts";

// Внешние ресурсы передаются сюда, а не импортируются глобально: тест подставляет тестовую базу и узел без сети.
export type AppDeps = { db: Database; chain: ChainClient; appOrigin: string };

// Сборка приложения отдельно от запуска: тест создаёт app и шлёт запросы через inject без порта.
export function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  // Type provider выводит типы параметров, тела и ответа из схем TypeBox: одна схема и проверяет данные, и задаёт тип.
  const app = Fastify(options).withTypeProvider<TypeBoxTypeProvider>();
  registerErrorHandlers(app);
  void app.register(fastifyCookie);
  void app.register(healthRoutes, deps);
  // Версия в пути: формат ответа можно поменять в /v2, не ломая работающий frontend.
  void app.register(authRoutes, { ...deps, prefix: "/v1/auth" });

  return app;
}
