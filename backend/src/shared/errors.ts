import type { FastifyInstance } from "fastify";
import { type Static, Type } from "typebox";

// Единый формат ошибки API: code — стабильный машинный ключ, message — пояснение для разработчика.
// Одна схема даёт и тип для кода, и описание ответа для маршрутов.
export const ApiErrorSchema = Type.Object({ error: Type.Object({ code: Type.String(), message: Type.String() }) });
export type ApiError = Static<typeof ApiErrorSchema>;

// Поля, которые Fastify и наш код добавляют к Error. Ничего из них не гарантировано.
type HttpError = Error & { statusCode?: number; code?: string; validation?: unknown };

// Fastify 5 типизирует ошибку как unknown: в JavaScript можно бросить что угодно, не только Error.
function toHttpError(error: unknown): HttpError {
  return error instanceof Error ? error : new Error(`Non-error value thrown: ${String(error)}`);
}

export function registerErrorHandlers(app: FastifyInstance) {
  app.setNotFoundHandler((request, reply) => {
    const body: ApiError = { error: { code: "NOT_FOUND", message: `Route ${request.method} ${request.url} not found` } };
    return reply.code(404).send(body);
  });

  app.setErrorHandler((thrown: unknown, request, reply) => {
    const error = toHttpError(thrown);

    // Ошибка схемы запроса: клиент прислал не то, исправить может только он.
    if (error.validation) {
      const body: ApiError = { error: { code: "BAD_REQUEST", message: error.message } };
      return reply.code(400).send(body);
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode < 500) {
      const body: ApiError = { error: { code: error.code ?? "REQUEST_ERROR", message: error.message } };
      return reply.code(statusCode).send(body);
    }

    // Текст 5xx может содержать SQL, пути или секреты: он уходит только в лог, клиент видит общий ответ.
    request.log.error(error);
    const body: ApiError = { error: { code: "INTERNAL_ERROR", message: "Internal server error" } };
    return reply.code(500).send(body);
  });
}
