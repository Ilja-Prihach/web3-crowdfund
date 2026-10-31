import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addressHue, shortenAddress } from "./address.ts";

const address = "0xD3a9F1c2B4e5A6d7C8b9E0f1A2b3C4d5E6f771bC";

describe("shortenAddress", () => {
  it("оставляет начало и конец адреса без изменения регистра", () => {
    assert.equal(shortenAddress(address), "0xD3a9…71bC");
  });
});

describe("addressHue", () => {
  it("даёт один и тот же оттенок для одного адреса", () => {
    assert.equal(addressHue(address), addressHue(address));
  });

  it("возвращает оттенок в диапазоне 0–359", () => {
    for (const sample of [address, "0x0000000000000000000000000000000000000000", "0xffffff" + "0".repeat(34)]) {
      const hue = addressHue(sample);
      assert.ok(hue >= 0 && hue < 360, `${sample} → ${hue}`);
    }
  });
});
