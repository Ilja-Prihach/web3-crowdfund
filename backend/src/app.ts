import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify, { type FastifyServerOptions } from "fastify";

import type { ChainClient } from "./chain/client.ts";
import type { Database } from "./db/client.ts";
import { authRoutes } from "./modules/auth/routes.ts";
import { type AuthLimits, defaultAuthLimits } from "./modules/auth/service.ts";
import { healthRoutes } from "./modules/health/routes.ts";
import { registerErrorHandlers } from "./shared/errors.ts";
import { createFixedWindowLimiter } from "./shared/fixed-window.ts";

// Внешние ресурсы передаются сюда, а не импортируются глобально: тест подставляет тестовую базу и узел без сети.
// Лимиты по умолчанию — defaultAuthLimits; тест может уменьшить их, чтобы дойти до границы за несколько запросов.
export type AppDeps = { db: Database; chain: ChainClient; appOrigin: string; authLimits?: AuthLimits };

// Сборка приложения отдельно от запуска: тест создаёт app и шлёт запросы через inject без порта.
export function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  // Type provider выводит типы параметров, тела и ответа из схем TypeBox: одна схема и проверяет данные, и задаёт тип.
  const app = Fastify(options).withTypeProvider<TypeBoxTypeProvider>();
  registerErrorHandlers(app);
  void app.register(fastifyCookie);
  // Лимиты по адресу клиента (request.ip) включаются только на маршрутах с config.rateLimit.
  // Плагин регистрируется раньше маршрутов, иначе он не увидит их настройки.
  void app.register(fastifyRateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) =>
      Object.assign(new Error(`Rate limit exceeded, retry in ${context.after}`), {
        statusCode: context.statusCode,
        code: "RATE_LIMITED",
      }),
  });
  // Сессию кладёт хук requireSession; без входа поле остаётся null.
  app.decorateRequest("session", null);
  void app.register(healthRoutes, deps);
  // Версия в пути: формат ответа можно поменять в /v2, не ломая работающий frontend.
  const limits = deps.authLimits ?? defaultAuthLimits;
  void app.register(authRoutes, {
    ...deps,
    limits,
    allowRpcVerification: createFixedWindowLimiter(limits.rpcVerificationsPerMinute, 60_000),
    prefix: "/v1/auth",
  });

  return app;
}
