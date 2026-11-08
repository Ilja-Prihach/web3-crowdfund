import { randomBytes } from "node:crypto";

import type { Database } from "../../db/client.ts";
import { deleteExpiredNonces, insertNonce } from "./repository.ts";

// Nonce — 32 байта криптографического генератора. generateSiweNonce() из viem не годится:
// он берёт Math.random(), и соседние nonce совпадают со сдвигом в один символ.
export async function issueNonce(db: Database) {
  const nonce = randomBytes(32).toString("hex");
  // Попутная чистка вместо планировщика: таблица не растёт от брошенных попыток входа.
  await deleteExpiredNonces(db);
  await insertNonce(db, nonce);
  return nonce;
}
