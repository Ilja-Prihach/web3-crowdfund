import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toCampaignStatus, toFundingMode } from "./campaign.ts";

describe("toCampaignStatus", () => {
  it("переводит индексы enum CampaignStatus в ключи по порядку Solidity", () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4].map(toCampaignStatus),
      ["active", "successful", "failed", "withdrawn", "cancelled"],
    );
  });

  it("отказывается от неизвестного значения", () => {
    assert.throws(() => toCampaignStatus(5), /Unknown campaign status: 5/);
  });
});

describe("toFundingMode", () => {
  it("переводит индексы enum FundingMode в ключи по порядку Solidity", () => {
    assert.deepEqual([0, 1].map(toFundingMode), ["fixedDeadline", "openEnded"]);
  });

  it("отказывается от неизвестного значения", () => {
    assert.throws(() => toFundingMode(2), /Unknown funding mode: 2/);
  });
});
