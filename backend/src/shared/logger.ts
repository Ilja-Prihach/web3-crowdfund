import { BaseError } from "viem";

import type { Env } from "../config/env.ts";

type SerializedError = {
  type: string;
  message: string;
  stack: string;
  details?: string;
  code?: unknown;
  cause?: SerializedError;
};

// Только строки кадров «at …»: первые строки stack повторяют message, а у viem в нём URL узла.
const stackFrames = (stack = "") =>
  stack
    .split("\n")
    .filter((line) => line.trimStart().startsWith("at "))
    .join("\n");

// Ошибки viem пишут URL узла в message, details и stack, а в URL может быть ключ провайдера.
// Для них в лог идут только тип, короткое сообщение, ответ узла (details), код и кадры stack;
// цепочка cause обходится так же.
export function serializeError(error: unknown, depth = 0): SerializedError {
  if (!(error instanceof Error)) return { type: typeof error, message: String(error), stack: "" };
  const code = (error as { code?: unknown }).code;
  const cause = error.cause !== undefined && depth < 5 ? serializeError(error.cause, depth + 1) : undefined;
  const isViem = error instanceof BaseError;

  return {
    type: error.name,
    message: isViem ? error.shortMessage : error.message,
    stack: isViem ? stackFrames(error.stack) : (error.stack ?? ""),
    ...(isViem && error.details ? { details: error.details } : {}),
    ...(code === undefined ? {} : { code }),
    ...(cause && { cause }),
  };
}

// Fastify пишет о запросе только метод, URL и адрес: ключ req проходит через его сериализатор.
// Опасен код, который логирует request.headers или request.body напрямую: в них cookie сессии,
// сообщение и подпись входа. Эти поля заменяются заглушкой.
// stream нужен тестам: они собирают строки лога и проверяют, что секретов в них нет.
export function loggerOptions(level: Env["logLevel"], stream?: { write: (line: string) => void }) {
  return {
    level,
    redact: {
      paths: ["headers.cookie", 'headers["set-cookie"]', "body.message", "body.signature"],
      censor: "[redacted]",
    },
    serializers: { err: (error: Error) => serializeError(error), error: (error: Error) => serializeError(error) },
    ...(stream ? { stream } : {}),
  };
}
