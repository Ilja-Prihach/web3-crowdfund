import { Type } from "typebox";

import { ApiErrorSchema } from "../../shared/errors.ts";

export const nonceSchema = {
  response: { 201: Type.Object({ nonce: Type.String({ pattern: "^[0-9a-f]{64}$" }) }) },
};

export const verifySchema = {
  body: Type.Object({
    // Сообщение EIP-4361 занимает несколько сотен символов; лимит отсекает мусор до разбора.
    message: Type.String({ minLength: 1, maxLength: 2_000 }),
    // Подпись обычного кошелька — 65 байт, обёртка ERC-6492 смарт-кошелька длиннее.
    signature: Type.String({ pattern: "^0x[0-9a-fA-F]+$", maxLength: 16_384 }),
  }),
  response: {
    200: Type.Object({ address: Type.String(), expiresAt: Type.String({ format: "date-time" }) }),
    401: ApiErrorSchema,
  },
};
