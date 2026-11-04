import Fastify, { type FastifyServerOptions } from "fastify";

// Сборка приложения отдельно от запуска: тест создаёт app и шлёт запросы через inject без порта.
export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  // Проверка живости: оркестратор и человек узнают, что процесс отвечает.
  app.get("/health", async () => ({ status: "ok" }));

  return app;
}
