import { buildApp } from "./app.ts";

const port = Number(process.env.PORT ?? 4000);
// Только этот компьютер: с 0.0.0.0 сервер был бы виден всей локальной сети.
const host = process.env.HOST ?? "127.0.0.1";

const app = buildApp({ logger: true });

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
