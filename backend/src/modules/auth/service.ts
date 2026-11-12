import { createHash, randomBytes } from "node:crypto";

import { getAddress, hashMessage, type Hex, isAddressEqual, recoverMessageAddress } from "viem";
import { verifyHash } from "viem/actions";
import { parseSiweMessage, validateSiweMessage } from "viem/siwe";

import type { ChainClient } from "../../chain/client.ts";
import { crowdfunding } from "../../chain/contract.ts";
import type { Database } from "../../db/client.ts";
import { consumeNonce, countNonces, createSession, deleteExpiredNonces, insertNonce } from "./repository.ts";

export type AuthLimits = {
  // Живых nonce одновременно. Сверх — 503: таблица не растёт от атаки с многих адресов.
  nonceCapacity: number;
  // Проверок подписи через RPC в минуту на весь сервер — защита квоты провайдера.
  rpcVerificationsPerMinute: number;
  // Запросов в минуту с одного адреса клиента.
  perIp: { nonce: number; verify: number; session: number; logout: number };
};

export const defaultAuthLimits: AuthLimits = {
  nonceCapacity: 10_000,
  rpcVerificationsPerMinute: 30,
  perIp: { nonce: 10, verify: 10, session: 60, logout: 30 },
};

export type AuthDeps = {
  db: Database;
  chain: ChainClient;
  appOrigin: string;
  limits: AuthLimits;
  // Разрешение на ещё одну проверку подписи через RPC; false — бюджет на эту минуту исчерпан.
  allowRpcVerification: () => boolean;
};

// Причина отказа входа. Клиент получает общий 401, причина пишется только в лог.
export class SignInError extends Error {}

// Сервер перегружен попытками входа: 503, клиенту стоит повторить позже.
export class AuthBusyError extends Error {}

const messageMaxAgeMs = 10 * 60_000;
const clockSkewMs = 60_000;

// Nonce — 32 байта криптографического генератора. generateSiweNonce() из viem не годится:
// он берёт Math.random(), и соседние nonce совпадают со сдвигом в один символ.
export async function issueNonce(db: Database, capacity: number) {
  const nonce = randomBytes(32).toString("hex");
  // Попутная чистка вместо планировщика: таблица не растёт от брошенных попыток входа.
  await deleteExpiredNonces(db);
  // Потолок не зависит от адреса клиента: подмена или общий IP за прокси его не обходят.
  // Подсчёт и вставка не атомарны, поэтому при гонке потолок может быть превышен на несколько строк.
  if ((await countNonces(db)) >= capacity) throw new AuthBusyError("nonce capacity reached");
  await insertNonce(db, nonce);
  return nonce;
}

// В базе только SHA-256 идентификатора: по хэшу нельзя восстановить cookie.
export function hashSessionId(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

// Поля сообщения, которые validateSiweMessage из viem не проверяет: chainId, uri, version, scheme и свежесть issuedAt.
function checkMessageFields(message: string, appOrigin: string, now: Date) {
  const parsed = parseSiweMessage(message);
  const app = new URL(appOrigin);

  // viem: domain, адрес, expirationTime и notBefore.
  if (!validateSiweMessage({ message: parsed, domain: app.host, time: now })) {
    throw new SignInError("domain, address or validity window rejected");
  }

  if (!parsed.uri || !URL.canParse(parsed.uri) || new URL(parsed.uri).origin !== appOrigin) {
    throw new SignInError("uri mismatch");
  }
  if (parsed.scheme !== undefined && `${parsed.scheme}:` !== app.protocol) throw new SignInError("scheme mismatch");
  if (parsed.chainId !== crowdfunding.chain.id) throw new SignInError("chain mismatch");
  if (parsed.version !== "1") throw new SignInError("unsupported version");
  if (!parsed.nonce || !/^[0-9a-f]{64}$/.test(parsed.nonce)) throw new SignInError("malformed nonce");

  // Сообщение подписывают сразу после выдачи nonce: старое или «из будущего» — повод отказать.
  const issuedAt = parsed.issuedAt?.getTime() ?? Number.NaN;
  if (Number.isNaN(issuedAt)) throw new SignInError("missing issuedAt");
  if (issuedAt > now.getTime() + clockSkewMs) throw new SignInError("issuedAt in the future");
  if (now.getTime() - issuedAt > messageMaxAgeMs) throw new SignInError("message too old");

  return { nonce: parsed.nonce, address: getAddress(parsed.address ?? "") };
}

export async function signIn(
  { db, chain, appOrigin, allowRpcVerification }: AuthDeps,
  { message, signature }: { message: string; signature: Hex },
  now = new Date(),
) {
  // Адрес берётся из проверенного сообщения, а не из отдельного поля запроса.
  const { nonce, address } = checkMessageFields(message, appOrigin, now);

  // Nonce гасится до проверки подписи: один выданный nonce — одна попытка. Иначе запрос с выдуманным
  // или чужим nonce доходил бы до RPC и тратил квоту, а с одним настоящим nonce попыток было бы сколько угодно.
  if (!(await consumeNonce(db, nonce))) throw new SignInError("unknown, expired or used nonce");

  // Обычный кошелёк проверяется локально восстановлением адреса из подписи, без RPC.
  const recovered = await recoverMessageAddress({ message, signature }).catch(() => null);
  if (!recovered || !isAddressEqual(recovered, address)) {
    // К сети идёт только подпись, которую не удалось проверить локально, — смарт-кошелёк (ERC-1271 / ERC-6492)
    // или чужая. Бюджет общий на сервер: исчерпать квоту RPC нельзя даже с многих адресов,
    // а входу обычными кошельками он не мешает.
    if (!allowRpcVerification()) throw new AuthBusyError("signature RPC budget exhausted");
    const valid = await verifyHash(chain, { address, hash: hashMessage(message), signature });
    if (!valid) throw new SignInError("invalid signature");
  }

  const sessionId = randomBytes(32).toString("base64url");
  const session = await createSession(db, { idHash: hashSessionId(sessionId), address: address.toLowerCase() });

  return { sessionId, address, expiresAt: session.expiresAt };
}
