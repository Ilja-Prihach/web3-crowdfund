import type { Env } from "../config/env.ts";

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
    ...(stream ? { stream } : {}),
  };
}
