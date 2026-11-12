import type { FastifyReply, FastifyRequest } from "fastify";
import { type Address, getAddress } from "viem";

import type { Database } from "../../db/client.ts";
import type { ApiError } from "../../shared/errors.ts";
import { findLiveSession } from "./repository.ts";
import { hashSessionId } from "./service.ts";

export type Session = { address: Address; expiresAt: Date };

// Fastify должен знать поле заранее: значение по умолчанию задаёт decorateRequest в buildApp.
declare module "fastify" {
  interface FastifyRequest {
    session: Session | null;
  }
}

export const sessionCookie = "openfund_session";

// httpOnly — недоступна JavaScript страницы; secure — только по https (и на localhost);
// sameSite lax — не уходит с POST-запросами чужих сайтов. Те же атрибуты нужны и для удаления cookie.
export const sessionCookieOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/" } as const;

export async function loadSession(db: Database, request: FastifyRequest): Promise<Session | null> {
  const sessionId = request.cookies[sessionCookie];
  if (!sessionId) return null;

  const session = await findLiveSession(db, hashSessionId(sessionId));
  return session ? { address: getAddress(session.address), expiresAt: session.expiresAt } : null;
}

export function clearSessionCookie(reply: FastifyReply) {
  void reply.clearCookie(sessionCookie, sessionCookieOptions);
}

// preHandler для маршрутов, которым нужен вход: кладёт сессию в request.session или отвечает 401.
export function requireSession(db: Database) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    request.session = await loadSession(db, request);
    if (request.session) return;

    // Cookie есть, а сессии нет — истекла, вышли или подделка: браузеру незачем её хранить.
    if (request.cookies[sessionCookie]) clearSessionCookie(reply);
    const body: ApiError = { error: { code: "UNAUTHORIZED", message: "Sign-in required" } };
    return reply.code(401).send(body);
  };
}
