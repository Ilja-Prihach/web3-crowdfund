import { buildApp } from "./app.ts";
import { createChainClient } from "./chain/client.ts";
import { loadEnv } from "./config/env.ts";
import { createDatabase } from "./db/client.ts";
import { loggerOptions } from "./shared/logger.ts";

const env = loadEnv();
const { db, pool } = createDatabase(env.databaseUrl, {
  // Простаивающее соединение появляется только после старта, когда app уже создан.
  onIdleError: (error) => app.log.warn(error, "idle database connection failed"),
});
const chain = createChainClient(env.sepoliaRpcUrl);
const app = buildApp(
  { db, chain, appOrigin: env.appOrigin },
  // Без TRUST_PROXY request.ip — адрес соединения; с ним — адрес клиента из X-Forwarded-For доверенного прокси.
  { logger: loggerOptions(env.logLevel), trustProxy: env.trustProxy.length > 0 ? env.trustProxy : false },
);
// Пул закрывается последним шагом плавной остановки, после текущих запросов.
app.addHook("onClose", () => pool.end());

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
