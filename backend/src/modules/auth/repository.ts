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

// Гасит nonce, если он выдан и не истёк. DELETE … RETURNING блокирует строку:
// из двух одновременных попыток с одним nonce строку получит одна.
export async function consumeNonce(db: Database, nonce: string) {
  const consumed = await db
    .delete(authNonces)
    .where(and(eq(authNonces.nonce, nonce), gt(authNonces.expiresAt, sql`now()`)))
    .returning({ nonce: authNonces.nonce });
  return consumed.length > 0;
}

export async function createSession(db: Database, { idHash, address }: { idHash: string; address: string }) {
  return db.transaction(async (tx) => {
    // Попутная чистка, как у nonce: просроченные сессии не копятся.
    await tx.delete(authSessions).where(lt(authSessions.expiresAt, sql`now()`));
    const [session] = await tx
      .insert(authSessions)
      .values({ idHash, address, expiresAt: sql`now() + interval '7 days'` })
      .returning({ expiresAt: authSessions.expiresAt });
    if (!session) throw new Error("session insert returned no row");
    return session;
  });
}

// Живая сессия по хэшу идентификатора: просроченная считается отсутствующей, даже если строка ещё не удалена.
export async function findLiveSession(db: Database, idHash: string) {
  const [session] = await db
    .select({ address: authSessions.address, expiresAt: authSessions.expiresAt })
    .from(authSessions)
    .where(and(eq(authSessions.idHash, idHash), gt(authSessions.expiresAt, sql`now()`)));
  return session ?? null;
}

export async function deleteSession(db: Database, idHash: string) {
  await db.delete(authSessions).where(eq(authSessions.idHash, idHash));
}
