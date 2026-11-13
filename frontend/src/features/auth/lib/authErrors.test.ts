import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UserRejectedRequestError } from "viem";

import { AuthApiError } from "../api/authApi.ts";
import { getSignInErrorMessage } from "./authErrors.ts";

const wrap = (cause: unknown) => Object.assign(new Error("wrapped"), { cause });

describe("getSignInErrorMessage", () => {
  it("отказ в кошельке", () => {
    assert.match(getSignInErrorMessage(wrap(new UserRejectedRequestError(new Error("denied")))), /отменили подпись/);
  });

  it("истёкший nonce отличается от прочих отказов только по времени с выдачи", () => {
    const invalid = new AuthApiError(401, "SIWE_INVALID");

    assert.match(getSignInErrorMessage(invalid, 11 * 60_000), /больше 10 минут/);
    assert.match(getSignInErrorMessage(invalid, 30_000), /не принял подпись/);
  });

  it("лимиты, перегрузка, чужой источник и недоступный сервер", () => {
    assert.match(getSignInErrorMessage(new AuthApiError(429, "RATE_LIMITED")), /Подождите минуту/);
    assert.match(getSignInErrorMessage(new AuthApiError(503, "AUTH_BUSY")), /перегружен/);
    assert.match(getSignInErrorMessage(new AuthApiError(403, "ORIGIN_FORBIDDEN")), /только с сайта/);
    assert.match(getSignInErrorMessage(new AuthApiError(0, "NETWORK_ERROR")), /недоступен/);
  });
});
