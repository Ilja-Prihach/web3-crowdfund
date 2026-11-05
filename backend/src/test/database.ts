import { createDatabase } from "../db/client.ts";

// Отдельная БД из compose.yaml: тесты не трогают рабочую openfund.
const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? "postgres://openfund:openfund@127.0.0.1:5433/openfund_test";

type TestDatabaseOptions = {
  applicationName?: string;
  // По умолчанию обрыв простаивающего соединения в тестах игнорируется: пул сам откроет новое.
  onIdleError?: (error: Error) => void;
};

export function createTestDatabase({
  applicationName = "openfund-backend-test",
  onIdleError = () => {},
}: TestDatabaseOptions = {}) {
  return createDatabase(testDatabaseUrl, { onIdleError, applicationName });
}
