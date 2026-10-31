import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatEth, getProgressPercent } from "./money.ts";

const halfEth = 500_000_000_000_000_000n;

describe("formatEth", () => {
  it("показывает ноль без дробной части", () => {
    assert.equal(formatEth(0n), "0 ETH");
  });

  it("ставит русскую запятую", () => {
    assert.equal(formatEth(halfEth), "0,5 ETH");
  });

  it("отбрасывает лишние знаки, а не округляет", () => {
    assert.equal(formatEth(123_456_789_012_345_678n), "0,1234 ETH");
    assert.equal(formatEth(499_990_000_000_000_000n), "0,4999 ETH");
  });

  it("не выдаёт крошечную сумму за ноль", () => {
    assert.equal(formatEth(10_000_000_000_000n), "0,00001 ETH");
    assert.equal(formatEth(12_345_678_000_000n), "0,00001234 ETH");
    assert.equal(formatEth(1n), "0,000000000000000001 ETH");
  });

  it("разделяет тысячи неразрывным пробелом", () => {
    assert.equal(formatEth(12_345n * 10n ** 18n), "12 345 ETH");
  });
});

describe("getProgressPercent", () => {
  it("считает долю от цели", () => {
    assert.equal(getProgressPercent(halfEth / 2n, halfEth), 50);
  });

  it("не показывает 100%, пока не хватает даже 1 wei", () => {
    assert.equal(getProgressPercent(halfEth - 1n, halfEth), 99);
  });

  it("не ограничивает сбор сверх цели", () => {
    assert.equal(getProgressPercent(600_000_000_000_000_000n, halfEth), 120);
  });

  it("не делит на ноль", () => {
    assert.equal(getProgressPercent(halfEth, 0n), 0);
  });
});
