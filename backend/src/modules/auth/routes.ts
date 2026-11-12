import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Hex } from "viem";

import type { ApiError } from "../../shared/errors.ts";
import { deleteSession } from "./repository.ts";
import { logoutSchema, nonceSchema, sessionSchema, verifySchema } from "./schemas.ts";
import { AuthBusyError, type AuthDeps, hashSessionId, issueNonce, SignInError, signIn } from "./service.ts";
import { clearSessionCookie, requireSession, sessionCookie, sessionCookieOptions } from "./session.ts";

const sessionMaxAgeSeconds = 7 * 24 * 60 * 60;
const perMinute = (max: number) => ({ rateLimit: { max, timeWindow: 60_000 } });

// Перегрузка входа: 503 с подсказкой повторить через минуту; причина — в лог уровня warn.
function replyBusy(request: FastifyRequest, reply: FastifyReply, error: AuthBusyError) {
  request.log.warn({ reason: error.message }, "sign-in busy");
  const body: ApiError = { error: { code: "AUTH_BUSY", message: "Too many sign-in attempts, retry later" } };
  return reply.code(503).header("retry-after", "60").send(body);
}

export const authRoutes: FastifyPluginCallbackTypebox<AuthDeps> = (app, deps, done) => {
  const { perIp } = deps.limits;

  // Защита от CSRF сверх SameSite=Lax: браузер всегда присылает Origin с POST, и он должен быть нашим.
  // Запрос без Origin — не из браузера, а значит, и без cookie жертвы; такой запрос пропускается.
  app.addHook("onRequest", async (request, reply) => {
    const { origin } = request.headers;
    if (request.method !== "POST" || origin === undefined || origin === deps.appOrigin) return;
    const body: ApiError = { error: { code: "ORIGIN_FORBIDDEN", message: "Request origin is not allowed" } };
    return reply.code(403).send(body);
  });

  // POST, а не GET: запрос создаёт строку в базе, а GET по правилам HTTP не должен ничего менять.
  app.post("/nonce", { schema: nonceSchema, config: perMinute(perIp.nonce) }, async (request, reply) => {
    try {
      const nonce = await issueNonce(deps.db, deps.limits.nonceCapacity);
      // Nonce одноразовый: ни браузер, ни промежуточный прокси не должны отдавать его из кэша.
      return reply.code(201).header("cache-control", "no-store").send({ nonce });
    } catch (error) {
      if (error instanceof AuthBusyError) return replyBusy(request, reply, error);
      throw error;
    }
  });

  app.post("/verify", { schema: verifySchema, config: perMinute(perIp.verify) }, async (request, reply) => {
    try {
      const { sessionId, address, expiresAt } = await signIn(deps, {
        message: request.body.message,
        signature: request.body.signature as Hex,
      });
      void reply.setCookie(sessionCookie, sessionId, { ...sessionCookieOptions, maxAge: sessionMaxAgeSeconds });
      return reply.header("cache-control", "no-store").send({ address, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      if (error instanceof AuthBusyError) return replyBusy(request, reply, error);
      if (!(error instanceof SignInError)) throw error;
      // Клиенту общий ответ: подробности упрощали бы подбор. Сообщение и подпись в лог не пишутся.
      request.log.info({ reason: error.message }, "sign-in rejected");
      const body: ApiError = { error: { code: "SIWE_INVALID", message: "Sign-in message or signature is invalid" } };
      return reply.code(401).send(body);
    }
  });

  app.get(
    "/session",
    { schema: sessionSchema, config: perMinute(perIp.session), preHandler: requireSession(deps.db) },
    (request, reply) => {
      const { session } = request;
      if (!session) throw new Error("requireSession did not set request.session");
      void reply.header("cache-control", "no-store");
      return { address: session.address, expiresAt: session.expiresAt.toISOString() };
    },
  );

  // Выход идемпотентен: без cookie или с уже удалённой сессией ответ тот же — 204 и очищенная cookie.
  app.post("/logout", { schema: logoutSchema, config: perMinute(perIp.logout) }, async (request, reply) => {
    const sessionId = request.cookies[sessionCookie];
    if (sessionId) await deleteSession(deps.db, hashSessionId(sessionId));
    clearSessionCookie(reply);
    return reply.code(204).send(null);
  });

  done();
};
