import { Type } from "typebox";

import { ApiErrorSchema } from "../../shared/errors.ts";

// Схема ответа — контракт маршрута: Fastify сериализует только описанные поля, а TypeScript проверяет обработчик.
export const healthSchema = {
  response: { 200: Type.Object({ status: Type.Literal("ok") }) },
};

export const readySchema = {
  response: { 200: Type.Object({ status: Type.Literal("ready") }), 503: ApiErrorSchema },
};
