import { Type } from "typebox";

export const nonceSchema = {
  response: { 201: Type.Object({ nonce: Type.String({ pattern: "^[0-9a-f]{64}$" }) }) },
};
