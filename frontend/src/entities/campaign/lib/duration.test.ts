import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { maxDurationDays, parseDurationDays } from "./duration.ts";

describe("parseDurationDays", () => {
  it("принимает границы 1 и 365 дней", () => {
    assert.deepEqual(parseDurationDays("1"), { ok: true, days: 1n });
    assert.deepEqual(parseDurationDays(String(maxDurationDays)), { ok: true, days: 365n });
  });

  it("обрезает пробелы по краям", () => {
    assert.deepEqual(parseDurationDays(" 30 "), { ok: true, days: 30n });
  });

  it("отклоняет ноль, превышение, дроби, экспоненту и пустой ввод", () => {
    for (const input of ["0", "366", "1.5", "1e2", "", " "]) {
      assert.deepEqual(parseDurationDays(input), { ok: false, error: "Срок — целое число дней от 1 до 365" }, input);
    }
  });
});
