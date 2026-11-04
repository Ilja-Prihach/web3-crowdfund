import Fastify, { type FastifyServerOptions } from "fastify";

import { registerErrorHandlers } from "./shared/errors.ts";

// Сборка приложения отдельно от запуска: тест создаёт app и шлёт запросы через inject без порта.
export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);
  registerErrorHandlers(app);

  // Проверка живости: оркестратор и человек узнают, что процесс отвечает.
  app.get("/health", () => ({ status: "ok" }));

  return app;
}
