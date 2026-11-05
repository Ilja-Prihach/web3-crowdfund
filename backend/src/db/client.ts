import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

type DatabaseOptions = {
  // Без слушателя событие error простаивающего соединения роняет процесс: перезапуск базы убил бы весь API.
  onIdleError: (error: Error) => void;
  // Имя в pg_stat_activity: видно, кто держит соединения.
  applicationName?: string;
};

// Пул держит до 10 соединений: открывать новое на каждый запрос — это сеть и авторизация заново.
export function createDatabase(url: string, { onIdleError, applicationName = "openfund-backend" }: DatabaseOptions) {
  const pool = new pg.Pool({ connectionString: url, max: 10, application_name: applicationName });
  // Сломанное соединение пул выбрасывает сам и при следующем запросе открывает новое.
  pool.on("error", onIdleError);
  return { db: drizzle({ client: pool }), pool };
}

export type Database = ReturnType<typeof createDatabase>["db"];
