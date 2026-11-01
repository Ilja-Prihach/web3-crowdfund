import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCampaignId } from "./campaignId.ts";

const maxUint256 = 2n ** 256n - 1n;

describe("parseCampaignId", () => {
  it("принимает десятичные ID в пределах uint256", () => {
    assert.equal(parseCampaignId("0"), 0n);
    assert.equal(parseCampaignId("7"), 7n);
    assert.equal(parseCampaignId(maxUint256.toString()), maxUint256);
  });

  it("отклоняет то, что BigInt понял бы иначе или не понял бы вовсе", () => {
    for (const value of ["", "abc", "-1", "1.5", "007", "1e3", "0x1", " 1"]) {
      assert.equal(parseCampaignId(value), null, `«${value}» должен быть отклонён`);
    }
  });

  it("отклоняет число больше uint256", () => {
    assert.equal(parseCampaignId((maxUint256 + 1n).toString()), null);
  });
});
