import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getWalletName } from "./walletName.ts";

describe("getWalletName", () => {
  it("называет общий injected-коннектор браузерным кошельком", () => {
    assert.equal(getWalletName({ id: "injected", name: "Injected" }), "Браузерный кошелёк");
  });

  it("оставляет имя кошелька, найденного по EIP-6963", () => {
    assert.equal(getWalletName({ id: "io.rabby", name: "Rabby Wallet" }), "Rabby Wallet");
  });
});
