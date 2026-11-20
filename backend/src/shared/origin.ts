import type { FastifyReply, FastifyRequest } from "fastify";

import type { ApiError } from "./errors.ts";

// Методы, которые меняют данные. GET и HEAD по правилам HTTP ничего не меняют, их можно звать с любого сайта.
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Защита от CSRF сверх SameSite=Lax: браузер всегда присылает Origin с изменяющим запросом, и он должен быть нашим.
// Запрос без Origin — не из браузера, а значит, и без cookie жертвы; такой запрос пропускается.
export function rejectForeignOrigin(appOrigin: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { origin } = request.headers;
    if (!unsafeMethods.has(request.method) || origin === undefined || origin === appOrigin) return;
    const body: ApiError = { error: { code: "ORIGIN_FORBIDDEN", message: "Request origin is not allowed" } };
    return reply.code(403).send(body);
  };
}
