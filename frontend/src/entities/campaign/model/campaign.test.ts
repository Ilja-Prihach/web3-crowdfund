import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  campaignStatusLabels,
  fundingModeLabels,
  toCampaign,
  toCampaignStatus,
  toFundingMode,
} from "./campaign.ts";

describe("campaign labels", () => {
  it("использует понятные продуктовые названия статуса и режима", () => {
    assert.equal(campaignStatusLabels.failed, "Срок истёк");
    assert.equal(fundingModeLabels.fixedDeadline, "Сбор к сроку");
    assert.equal(fundingModeLabels.openEnded, "Открытая цель");
  });
});

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

describe("toCampaign", () => {
  it("переводит ответ getCampaigns в модель с ключами и bigint-суммами", () => {
    const creator = "0xD3a9F1c2B4e5A6d7C8b9E0f1A2b3C4d5E6f771bC";

    const campaign = toCampaign({
      id: 1n,
      campaign: {
        creator,
        fundingMode: 1,
        title: "Сбор",
        description: "Описание",
        goal: 500_000_000_000_000_000n,
        deadline: 0n,
        totalRaised: 1n,
        fundsWithdrawn: false,
        cancelled: false,
      },
      status: 0,
    });

    assert.deepEqual(campaign, {
      id: 1n,
      creator,
      title: "Сбор",
      description: "Описание",
      goal: 500_000_000_000_000_000n,
      deadline: 0n,
      totalRaised: 1n,
      fundingMode: "openEnded",
      status: "active",
    });
  });
});
