import type { Address, Hex } from "viem";

// Относительный путь: backend на том же источнике, поэтому cookie сессии — своя, а CORS не нужен.
const authBase = "/api/v1/auth";

export type Session = { address: Address; expiresAt: string };

// Ошибка backend: status 0 — сервер недоступен, code — машинный код из { error: { code } }.
export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, options?: ErrorOptions) {
    super(`Auth API ${status} ${code}`, options);
    this.name = "AuthApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${authBase}${path}`, { ...init, credentials: "same-origin" });
  } catch (cause) {
    throw new AuthApiError(0, "NETWORK_ERROR", { cause });
  }

  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
  if (!response.ok) throw new AuthApiError(response.status, body?.error?.code ?? "UNKNOWN_ERROR");
  return body as T;
}

const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const authApi = {
  nonce: async () => (await request<{ nonce: string }>("/nonce", { method: "POST" })).nonce,

  verify: (message: string, signature: Hex) => request<Session>("/verify", postJson({ message, signature })),

  // Нет входа — это не ошибка, а обычное состояние: 401 превращается в null.
  session: async () => {
    try {
      return await request<Session>("/session");
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 401) return null;
      throw error;
    }
  },

  logout: () => request<void>("/logout", { method: "POST" }),
};
