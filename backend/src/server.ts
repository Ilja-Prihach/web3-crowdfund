import { buildApp } from "./app.ts";
import { loadEnv } from "./config/env.ts";

const env = loadEnv();
const app = buildApp({ logger: { level: env.logLevel } });

// Docker и хостинг останавливают процесс сигналом: даём текущим запросам завершиться.
// once: если close зависнет, повторный сигнал завершит процесс как обычно.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "shutting down");
    app.close().then(
      () => process.exit(0),
      (error: unknown) => {
        app.log.error(error, "shutdown failed");
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ port: env.port, host: env.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
