import { isIP } from "node:net";

export type Env = {
  port: number;
  host: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  databaseUrl: string;
  sepoliaRpcUrl: string;
  appOrigin: string;
  trustProxy: string[];
  indexerBatchSize: number;
  indexerPollIntervalMs: number;
};

const logLevels: Env["logLevel"][] = ["fatal", "error", "warn", "info", "debug", "trace"];

// Адрес или диапазон CIDR: 10.0.0.1, 10.0.0.0/8, ::1, fd00::/8.
function isIpOrCidr(entry: string) {
  const [address = "", prefix, extra] = entry.split("/");
  const version = isIP(address);
  if (version === 0 || extra !== undefined) return false;
  if (prefix === undefined) return true;
  return /^\d+$/.test(prefix) && Number(prefix) <= (version === 4 ? 32 : 128);
}

function integerInRange(value: string | undefined, name: string, fallback: number, min: number, max: number) {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}, got "${value}"`);
  }
  return number;
}

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

  // Прокси, которым backend верит в X-Forwarded-For. По умолчанию никому: иначе любой клиент
  // подставил бы в заголовок произвольный адрес и обошёл лимиты по IP.
  const trustProxy = (source.TRUST_PROXY ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  for (const entry of trustProxy) {
    if (!isIpOrCidr(entry)) {
      throw new Error(`TRUST_PROXY must be a comma-separated list of IP addresses or CIDR ranges, got "${entry}"`);
    }
  }

  // Indexer: размер пачки eth_getLogs (1rpc отдаёт не больше 50 блоков) и пауза между опросами,
  // когда indexer догнал finalized (Ethereum выпускает блок раз в 12 секунд).
  const indexerBatchSize = integerInRange(source.INDEXER_BATCH_SIZE, "INDEXER_BATCH_SIZE", 50, 1, 10_000);
  const indexerPollIntervalMs = integerInRange(
    source.INDEXER_POLL_INTERVAL_MS,
    "INDEXER_POLL_INTERVAL_MS",
    12_000,
    1_000,
    3_600_000,
  );

  return {
    port,
    // Только этот компьютер: с 0.0.0.0 сервер был бы виден всей локальной сети.
    host: source.HOST ?? "127.0.0.1",
    logLevel: logLevel as Env["logLevel"],
    databaseUrl,
    sepoliaRpcUrl,
    appOrigin,
    trustProxy,
    indexerBatchSize,
    indexerPollIntervalMs,
  };
}
