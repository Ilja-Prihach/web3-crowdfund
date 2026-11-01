import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseEthAmount } from "./ethAmount.ts";

const formatError = { ok: false, error: "Введите число, например 0,01" };

describe("parseEthAmount", () => {
  it("переводит ETH в wei с точкой и с запятой", () => {
    assert.deepEqual(parseEthAmount("0.01"), { ok: true, wei: 10_000_000_000_000_000n });
    assert.deepEqual(parseEthAmount("0,01"), { ok: true, wei: 10_000_000_000_000_000n });
    assert.deepEqual(parseEthAmount("1"), { ok: true, wei: 10n ** 18n });
  });

  it("убирает пробелы по краям", () => {
    assert.deepEqual(parseEthAmount(" 0,5 "), { ok: true, wei: 500_000_000_000_000_000n });
  });

  it("принимает 18 знаков после запятой — ровно 1 wei", () => {
    assert.deepEqual(parseEthAmount("0.000000000000000001"), { ok: true, wei: 1n });
  });

  it("просит ввести сумму, если поле пустое", () => {
    assert.deepEqual(parseEthAmount("  "), { ok: false, error: "Введите сумму" });
  });

  it("отклоняет всё, что не является десятичным числом", () => {
    for (const input of ["abc", "-1", "1e3", "0x1", "1.", ".5", "1,2,3"]) {
      assert.deepEqual(parseEthAmount(input), formatError, `«${input}» должен быть отклонён`);
    }
  });

  it("не округляет молча больше 18 знаков", () => {
    assert.deepEqual(parseEthAmount("0.0000000000000000001"), {
      ok: false,
      error: "Не больше 18 знаков после запятой",
    });
  });

  it("отклоняет ноль", () => {
    for (const input of ["0", "0,000"]) {
      assert.deepEqual(parseEthAmount(input), { ok: false, error: "Сумма должна быть больше нуля" });
    }
  });
});
