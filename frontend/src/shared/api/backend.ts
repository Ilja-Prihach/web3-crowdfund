// Относительный путь: backend на том же источнике через прокси Next, CORS не нужен.
const backendBase = "/api/v1";
// Сколько ждать backend, прежде чем показать откат или сообщение об ошибке.
export const backendTimeoutMs = 5_000;

// Ошибка backend: status 0 — сеть, таймаут или отмена; code — машинный код backend или собственный.
export class BackendApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, options?: ErrorOptions) {
    super(`Backend API ${status} ${code}`, options);
    this.name = "BackendApiError";
    this.status = status;
    this.code = code;
  }
}

export type BackendRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  init?: Omit<RequestInit, "signal">;
};

// Запрос к backend с таймаутом. По умолчанию GET; форму успешного ответа проверяет вызывающий.
export async function requestBackend(
  path: string,
  { signal, timeoutMs = backendTimeoutMs, init }: BackendRequestOptions = {},
) {
  // Запрос обрывается и по отмене TanStack Query (ушли со страницы, сменили фильтр), и по таймауту.
  const timeout = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${backendBase}${path}`, {
      ...init,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (cause) {
    const code = timeout.aborted ? "TIMEOUT" : signal?.aborted ? "ABORTED" : "NETWORK_ERROR";
    throw new BackendApiError(0, code, { cause });
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
    throw new BackendApiError(response.status, typeof code === "string" ? code : "UNKNOWN_ERROR");
  }
  if (body === null || typeof body !== "object") throw new BackendApiError(response.status, "INVALID_RESPONSE");
  return body;
}

// Десятичная строка uint256 → bigint. Иное — ошибка ответа, а не SyntaxError из глубины BigInt.
export function parseUint(value: unknown, field: string) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new BackendApiError(200, "INVALID_RESPONSE", { cause: `${field} ${String(value)}` });
  }
  return BigInt(value);
}

// Последний finalized-блок, до которого indexer применил события; null — indexer ещё не запускался.
export function parseFinalizedBlock(value: unknown) {
  return value === null ? null : parseUint(value, "finalizedBlock");
}
