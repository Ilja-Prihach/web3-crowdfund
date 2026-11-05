export type Env = {
  port: number;
  host: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  databaseUrl: string;
};

const logLevels: Env["logLevel"][] = ["fatal", "error", "warn", "info", "debug", "trace"];

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

  return {
    port,
    // Только этот компьютер: с 0.0.0.0 сервер был бы виден всей локальной сети.
    host: source.HOST ?? "127.0.0.1",
    logLevel: logLevel as Env["logLevel"],
    databaseUrl,
  };
}
