import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";
import type { Hex } from "viem";

import type { ApiError } from "../../shared/errors.ts";
import { deleteSession } from "./repository.ts";
import { logoutSchema, nonceSchema, sessionSchema, verifySchema } from "./schemas.ts";
import { type AuthDeps, hashSessionId, issueNonce, SignInError, signIn } from "./service.ts";
import { clearSessionCookie, requireSession, sessionCookie, sessionCookieOptions } from "./session.ts";

const sessionMaxAgeSeconds = 7 * 24 * 60 * 60;

export const authRoutes: FastifyPluginCallbackTypebox<AuthDeps> = (app, deps, done) => {
  // POST, а не GET: запрос создаёт строку в базе, а GET по правилам HTTP не должен ничего менять.
  app.post("/nonce", { schema: nonceSchema }, async (_request, reply) => {
    const nonce = await issueNonce(deps.db);
    // Nonce одноразовый: ни браузер, ни промежуточный прокси не должны отдавать его из кэша.
    return reply.code(201).header("cache-control", "no-store").send({ nonce });
  });

  app.post("/verify", { schema: verifySchema }, async (request, reply) => {
    try {
      const { sessionId, address, expiresAt } = await signIn(deps, {
        message: request.body.message,
        signature: request.body.signature as Hex,
      });
      void reply.setCookie(sessionCookie, sessionId, { ...sessionCookieOptions, maxAge: sessionMaxAgeSeconds });
      return reply.header("cache-control", "no-store").send({ address, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      if (!(error instanceof SignInError)) throw error;
      // Клиенту общий ответ: подробности упрощали бы подбор. Сообщение и подпись в лог не пишутся.
      request.log.info({ reason: error.message }, "sign-in rejected");
      const body: ApiError = { error: { code: "SIWE_INVALID", message: "Sign-in message or signature is invalid" } };
      return reply.code(401).send(body);
    }
  });

  app.get("/session", { schema: sessionSchema, preHandler: requireSession(deps.db) }, (request, reply) => {
    const { session } = request;
    if (!session) throw new Error("requireSession did not set request.session");
    void reply.header("cache-control", "no-store");
    return { address: session.address, expiresAt: session.expiresAt.toISOString() };
  });

  // Выход идемпотентен: без cookie или с уже удалённой сессией ответ тот же — 204 и очищенная cookie.
  app.post("/logout", { schema: logoutSchema }, async (request, reply) => {
    const sessionId = request.cookies[sessionCookie];
    if (sessionId) await deleteSession(deps.db, hashSessionId(sessionId));
    clearSessionCookie(reply);
    return reply.code(204).send(null);
  });

  done();
};
