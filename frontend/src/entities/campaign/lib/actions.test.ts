import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Campaign } from "../model/campaign.ts";
import { getAvailableActions } from "./actions.ts";

const creator = "0xAcB3EF35168e5896a9a2bc8b40cDd0628b7DC9c6";
const supporter = "0xD3a9F1c2B4e5A6d7C8b9E0f1A2b3C4d5E6f771bC";

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 2n,
    creator,
    title: "Сбор",
    description: "Описание",
    goal: 10n,
    deadline: 1_800_000_000n,
    totalRaised: 0n,
    fundingMode: "fixedDeadline",
    status: "active",
    ...overrides,
  };
}

describe("getAvailableActions", () => {
  it("гостю на активной кампании предлагает только поддержать", () => {
    assert.deepEqual(getAvailableActions(campaign(), undefined, 0n), ["donate"]);
  });

  it("создателю активной fixed-кампании без вкладов разрешает отмену и смену срока", () => {
    assert.deepEqual(getAvailableActions(campaign(), creator, 0n), ["donate", "cancel", "updateDeadline"]);
  });

  it("запрещает смену срока после первого вклада и в open-ended", () => {
    assert.deepEqual(getAvailableActions(campaign({ totalRaised: 1n }), creator, 0n), ["donate", "cancel"]);
    assert.deepEqual(getAvailableActions(campaign({ fundingMode: "openEnded" }), creator, 0n), ["donate", "cancel"]);
  });

  it("узнаёт создателя по адресу в другом регистре", () => {
    const lowercase = creator.toLowerCase() as `0x${string}`;
    assert.deepEqual(getAvailableActions(campaign({ status: "successful" }), lowercase, 0n), ["withdraw"]);
  });

  it("после вывода средств создателю ничего не предлагает", () => {
    assert.deepEqual(getAvailableActions(campaign({ status: "withdrawn" }), creator, 0n), []);
  });

  it("возвращает вклад в open-ended до цели, но не в активной fixed-кампании", () => {
    assert.deepEqual(getAvailableActions(campaign({ fundingMode: "openEnded" }), supporter, 1n), ["donate", "refund"]);
    assert.deepEqual(getAvailableActions(campaign(), supporter, 1n), ["donate"]);
  });

  it("возвращает вклад после провала или отмены, но не после успеха", () => {
    assert.deepEqual(getAvailableActions(campaign({ status: "failed" }), supporter, 1n), ["refund"]);
    assert.deepEqual(getAvailableActions(campaign({ status: "cancelled" }), supporter, 1n), ["refund"]);
    assert.deepEqual(getAvailableActions(campaign({ status: "successful", fundingMode: "openEnded" }), supporter, 1n), []);
  });

  it("не предлагает возврат без вклада", () => {
    assert.deepEqual(getAvailableActions(campaign({ status: "failed" }), supporter, 0n), []);
  });
});
