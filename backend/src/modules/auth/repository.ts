import { and, eq, gt, lt, sql } from "drizzle-orm";

import type { Database } from "../../db/client.ts";
import { authNonces, authSessions } from "../../db/schema.ts";

// Срок считает часами базы, как и проверка при входе: часы приложения и базы могут расходиться.
const nonceLifetime = sql`now() + interval '10 minutes'`;

export async function insertNonce(db: Database, nonce: string) {
  await db.insert(authNonces).values({ nonce, expiresAt: nonceLifetime });
}

export async function deleteExpiredNonces(db: Database) {
  await db.delete(authNonces).where(lt(authNonces.expiresAt, sql`now()`));
}

// Одна транзакция: nonce удаляется и сессия создаётся вместе или не происходит ничего.
// DELETE … RETURNING блокирует строку: из двух одновременных входов с одним nonce строку получит один.
export async function consumeNonceAndCreateSession(
  db: Database,
  { nonce, idHash, address }: { nonce: string; idHash: string; address: string },
) {
  return db.transaction(async (tx) => {
    const [consumed] = await tx
      .delete(authNonces)
      .where(and(eq(authNonces.nonce, nonce), gt(authNonces.expiresAt, sql`now()`)))
      .returning({ nonce: authNonces.nonce });
    if (!consumed) return null;

    const [session] = await tx
      .insert(authSessions)
      .values({ idHash, address, expiresAt: sql`now() + interval '7 days'` })
      .returning({ expiresAt: authSessions.expiresAt });
    return session ?? null;
  });
}
