export type Env = {
  port: number;
  host: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  databaseUrl: string;
  sepoliaRpcUrl: string;
  appOrigin: string;
};

const logLevels: Env["logLevel"][] = ["fatal", "error", "warn", "info", "debug", "trace"];

// https везде, http — только для этого компьютера: по сети ключи и cookie шли бы открытым текстом.
function parseSecureUrl(value: string | undefined) {
  const url = value && URL.canParse(value) ? new URL(value) : null;
  const local = url?.hostname === "127.0.0.1" || url?.hostname === "localhost";
  return url && (url.protocol === "https:" || (url.protocol === "http:" && local)) ? url : null;
}

// Все переменные читаются и проверяются здесь, при старте: ошибка конфигурации видна сразу, а не на первом запросе.
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const port = Number(source.PORT ?? "4000");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT must be an integer from 1 to 65535, got "${source.PORT}"`);
  }

  const logLevel = source.LOG_LEVEL ?? "info";
  if (!logLevels.includes(logLevel as Env["logLevel"])) {
    throw new Error(`LOG_LEVEL must be one of ${logLevels.join(", ")}, got "${logLevel}"`);
  }

  const databaseUrl = source.DATABASE_URL;
  // Само значение в ошибку не попадает: в строке подключения пароль.
  if (!databaseUrl?.startsWith("postgres://") && !databaseUrl?.startsWith("postgresql://")) {
    throw new Error("DATABASE_URL must be a postgres:// connection string, see backend/.env.example");
  }

  const sepoliaRpcUrl = source.SEPOLIA_RPC_URL;
  // URL может содержать ключ провайдера, поэтому значение в ошибку тоже не попадает.
  if (!sepoliaRpcUrl || !parseSecureUrl(sepoliaRpcUrl)) {
    throw new Error("SEPOLIA_RPC_URL must be an https URL (http only for localhost), see backend/.env.example");
  }

  // Источник frontend: из него backend берёт ожидаемые domain и uri сообщения SIWE.
  // Ровно источник, без пути и косой черты в конце: сравнение строгое.
  const appOrigin = source.APP_ORIGIN;
  if (!appOrigin || parseSecureUrl(appOrigin)?.origin !== appOrigin) {
    throw new Error(
      `APP_ORIGIN must be an origin like https://openfund.example (http only for localhost), got "${appOrigin}"`,
    );
  }

  return {
    port,
    // Только этот компьютер: с 0.0.0.0 сервер был бы виден всей локальной сети.
    host: source.HOST ?? "127.0.0.1",
    logLevel: logLevel as Env["logLevel"],
    databaseUrl,
    sepoliaRpcUrl,
    appOrigin,
  };
}
