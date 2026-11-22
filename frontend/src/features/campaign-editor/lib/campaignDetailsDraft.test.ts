import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseEther } from "viem";

import type { CampaignDetails } from "../../../entities/campaign/api/detailsApi.ts";
import {
  campaignDetailsLimits,
  campaignDetailsToDraft,
  type CampaignDetailsDraft,
  maxCoverBytes,
  validateCampaignDetailsDraft,
  validateCoverFile,
} from "./campaignDetailsDraft.ts";

const draft = (overrides: Partial<CampaignDetailsDraft> = {}): CampaignDetailsDraft => ({
  category: "education",
  story: " История проекта ",
  budget: [{ label: " Аренда ", amount: "0,25" }],
  plan: [{ period: " Декабрь ", task: " Четыре лекции " }],
  risks: " Возможен перенос ",
  ...overrides,
});

describe("validateCampaignDetailsDraft", () => {
  it("нормализует тексты и переводит ETH в wei без Number", () => {
    const result = validateCampaignDetailsDraft(draft());

    assert.deepEqual(result, {
      ok: true,
      budgetTotal: parseEther("0.25"),
      input: {
        category: "education",
        story: "История проекта",
        budget: [{ label: "Аренда", amount: parseEther("0.25") }],
        plan: [{ period: "Декабрь", task: "Четыре лекции" }],
        risks: "Возможен перенос",
      },
    });
  });

  it("пустые необязательные разделы отправляет как null", () => {
    const result = validateCampaignDetailsDraft(draft({ category: "", story: " ", budget: [], plan: [], risks: "" }));

    assert.deepEqual(result, {
      ok: true,
      budgetTotal: 0n,
      input: { category: null, story: null, budget: null, plan: null, risks: null },
    });
  });

  it("отклоняет неполные строки, неверные суммы и серверные лимиты", () => {
    const cases = [
      draft({ budget: [{ label: "", amount: "1" }] }),
      draft({ budget: [{ label: "Зал", amount: "0" }] }),
      draft({ plan: [{ period: "Май", task: "" }] }),
      draft({ story: "a".repeat(campaignDetailsLimits.story + 1) }),
      draft({ risks: "a".repeat(campaignDetailsLimits.risks + 1) }),
      draft({ budget: Array(13).fill({ label: "Зал", amount: "1" }) }),
      draft({ plan: Array(13).fill({ period: "Май", task: "Лекция" }) }),
    ];

    for (const value of cases) assert.equal(validateCampaignDetailsDraft(value).ok, false);
  });
});

describe("campaignDetailsToDraft", () => {
  it("переводит существующие bigint обратно в точные строки ETH", () => {
    const details: CampaignDetails = {
      category: null,
      story: null,
      budget: [{ label: "Оборудование", amount: 2n ** 200n + 1n }],
      plan: null,
      risks: null,
      coverUrl: null,
      updatedAt: null,
    };

    const value = campaignDetailsToDraft(details);
    const result = validateCampaignDetailsDraft(value);
    assert.equal(result.ok && result.input.budget?.[0]?.amount, 2n ** 200n + 1n);
  });
});

describe("validateCoverFile", () => {
  it("принимает JPEG, PNG и WebP до 5 МБ", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      assert.equal(validateCoverFile({ type, size: maxCoverBytes }), null);
    }
  });

  it("отклоняет неизвестный формат, пустой и слишком большой файл", () => {
    assert.match(validateCoverFile({ type: "image/gif", size: 100 }) ?? "", /JPEG/);
    assert.match(validateCoverFile({ type: "image/png", size: 0 }) ?? "", /пустой/);
    assert.match(validateCoverFile({ type: "image/png", size: maxCoverBytes + 1 }) ?? "", /5 МБ/);
  });
});
