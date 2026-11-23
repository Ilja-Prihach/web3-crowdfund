import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify, { type FastifyServerOptions } from "fastify";
import type { ChainClient } from "./chain/client.ts";
import { type CampaignEditState, readCampaignEditState } from "./chain/creator.ts";
import type { Database } from "./db/client.ts";
import { authRoutes } from "./modules/auth/routes.ts";
import { type AuthLimits, defaultAuthLimits } from "./modules/auth/service.ts";
import { crowdfunding } from "./chain/contract.ts";
import type { MediaStorage } from "./media/storage.ts";
import { detailsRoutes, mediaRoutes } from "./modules/campaigns/details-routes.ts";
import { campaignRoutes } from "./modules/campaigns/routes.ts";
import { healthRoutes } from "./modules/health/routes.ts";
import { registerErrorHandlers } from "./shared/errors.ts";
import { createFixedWindowLimiter } from "./shared/fixed-window.ts";

// Внешние ресурсы передаются сюда, а не импортируются глобально: тест подставляет тестовую базу и узел без сети.
// Лимиты по умолчанию — defaultAuthLimits, 120 запросов каталога и 30 изменений деталей в минуту с адреса,
// 120 чтений creator из RPC в минуту на процесс; тест может уменьшить их, чтобы дойти до границы за несколько запросов.
export type AppDeps = {
  db: Database;
  chain: ChainClient;
  appOrigin: string;
  authLimits?: AuthLimits;
  catalogRequestsPerMinute?: number;
  media: MediaStorage;
  // Создатель и сумма пожертвований по контракту; по умолчанию — getCampaigns через chain.
  campaignEditState?: (campaignId: bigint) => Promise<CampaignEditState | null>;
  detailsWritesPerMinute?: number;
  creatorReadsPerMinute?: number;
};

// Сборка приложения отдельно от запуска: тест создаёт app и шлёт запросы через inject без порта.
export function buildApp(deps: AppDeps, options: FastifyServerOptions = {}) {
  // Type provider выводит типы параметров, тела и ответа из схем TypeBox: одна схема и проверяет данные, и задаёт тип.
  const app = Fastify(options).withTypeProvider<TypeBoxTypeProvider>();
  registerErrorHandlers(app);
  // Безопасные заголовки на всех ответах, включая ошибки: nosniff, CSP, HSTS и запрет встраивать ответы во фреймы.
  // CORS не подключается: браузер ходит в backend через /api своего источника.
  void app.register(fastifyHelmet);
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
  void app.register(campaignRoutes, {
    db: deps.db,
    requestsPerMinute: deps.catalogRequestsPerMinute ?? 120,
    prefix: "/v1/campaigns",
  });
  const readsPerMinute = deps.catalogRequestsPerMinute ?? 120;
  void app.register(detailsRoutes, {
    db: deps.db,
    media: deps.media,
    appOrigin: deps.appOrigin,
    campaignEditState:
      deps.campaignEditState ?? ((id) => readCampaignEditState(deps.chain, crowdfunding.address, id)),
    readsPerMinute,
    writesPerMinute: deps.detailsWritesPerMinute ?? 30,
    creatorReadsPerMinute: deps.creatorReadsPerMinute ?? 120,
    prefix: "/v1/campaigns",
  });
  void app.register(mediaRoutes, { media: deps.media, readsPerMinute, prefix: "/v1/media" });

  return app;
}
