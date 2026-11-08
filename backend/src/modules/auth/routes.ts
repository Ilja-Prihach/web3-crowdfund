import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";
import type { Hex } from "viem";

import type { ApiError } from "../../shared/errors.ts";
import { nonceSchema, verifySchema } from "./schemas.ts";
import { type AuthDeps, issueNonce, SignInError, signIn } from "./service.ts";

export const sessionCookie = "openfund_session";
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
      // httpOnly — недоступна JavaScript страницы; secure — только по https (и на localhost);
      // sameSite lax — не уходит с POST-запросами чужих сайтов.
      void reply.setCookie(sessionCookie, sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAgeSeconds,
      });
      return reply.header("cache-control", "no-store").send({ address, expiresAt: expiresAt.toISOString() });
    } catch (error) {
      if (!(error instanceof SignInError)) throw error;
      // Клиенту общий ответ: подробности упрощали бы подбор. Сообщение и подпись в лог не пишутся.
      request.log.info({ reason: error.message }, "sign-in rejected");
      const body: ApiError = { error: { code: "SIWE_INVALID", message: "Sign-in message or signature is invalid" } };
      return reply.code(401).send(body);
    }
  });

  done();
};
