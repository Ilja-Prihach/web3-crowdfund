import { lt, sql } from "drizzle-orm";

import type { Database } from "../../db/client.ts";
import { authNonces } from "../../db/schema.ts";

// Срок считает часами базы, как и проверка при входе: часы приложения и базы могут расходиться.
const nonceLifetime = sql`now() + interval '10 minutes'`;

export async function insertNonce(db: Database, nonce: string) {
  await db.insert(authNonces).values({ nonce, expiresAt: nonceLifetime });
}

export async function deleteExpiredNonces(db: Database) {
  await db.delete(authNonces).where(lt(authNonces.expiresAt, sql`now()`));
}
