import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { UserRejectedRequestError } from "viem";

import { getWalletErrorMessage } from "./walletErrors.ts";

// Матрёшка: ошибка библиотеки, внутри которой лежит исходная ошибка кошелька.
const wrap = (cause: unknown) => Object.assign(new Error("wrapped"), { cause });

describe("getWalletErrorMessage", () => {
  it("распознаёт отказ пользователя внутри цепочки cause", () => {
    const error = wrap(new UserRejectedRequestError(new Error("User denied")));
    assert.match(getWalletErrorMessage(error), /отменили запрос/);
  });

  it("распознаёт отсутствие кошелька", () => {
    const error = Object.assign(new Error("Provider not found."), { name: "ProviderNotFoundError" });
    assert.match(getWalletErrorMessage(error), /Кошелёк не найден/);
  });

  it("распознаёт уже открытый запрос в кошельке", () => {
    assert.match(getWalletErrorMessage(wrap({ code: -32002 })), /уже ждёт/);
  });

  it("распознаёт невозможность переключить сеть", () => {
    const error = Object.assign(new Error("no switch"), { name: "SwitchChainNotSupportedError" });
    assert.match(getWalletErrorMessage(error), /переключиться на Sepolia/);
  });

  it("для неизвестной ошибки возвращает общий текст", () => {
    assert.match(getWalletErrorMessage(new Error("boom")), /Попробуйте ещё раз/);
  });
});
