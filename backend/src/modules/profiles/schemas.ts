import { Type } from "typebox";

import { ApiErrorSchema } from "../../shared/errors.ts";
import { listCampaignsSchema } from "../campaigns/schemas.ts";

// PostgreSQL text не принимает NUL: отклоняем ввод схемой как 400 до обращения к БД.
const nullableText = (maxLength: number) => Type.Union([Type.String({ maxLength, pattern: "^[^\\u0000]*$" }), Type.Null()]);
export const profileParams = Type.Object({ address: Type.String({ pattern: "^0x[0-9a-fA-F]{40}$" }) });
export const ProfileSchema = Type.Object({
  address: Type.String({ pattern: "^0x[0-9a-f]{40}$" }),
  name: nullableText(80),
  bio: nullableText(1000),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});
export const getProfileSchema = { params: profileParams, response: { 200: ProfileSchema, 404: ApiErrorSchema } };
export const putProfileSchema = {
  body: Type.Object({ name: nullableText(80), bio: nullableText(1000) }, { additionalProperties: false }),
  response: { 200: ProfileSchema, 401: ApiErrorSchema, 403: ApiErrorSchema },
};
export const profileCampaignsSchema = {
  params: profileParams,
  querystring: Type.Object({
    limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50, default: 20 })),
    offset: Type.Optional(Type.Integer({ minimum: 0, maximum: 10_000, default: 0 })),
  }),
  response: listCampaignsSchema.response,
};
