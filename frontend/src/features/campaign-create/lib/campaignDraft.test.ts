import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type CampaignDraft, validateCampaignDraft } from "./campaignDraft.ts";

const fixed: CampaignDraft = {
  title: "Велодорожки",
  description: "Открытая карта",
  goal: "0,05",
  fundingMode: "fixedDeadline",
  durationDays: "30",
};

const errorsOf = (draft: CampaignDraft) => {
  const result = validateCampaignDraft(draft);
  assert.equal(result.ok, false);
  return result.ok ? {} : result.errors;
};

describe("validateCampaignDraft", () => {
  it("готовит аргументы createCampaign для кампании со сроком", () => {
    assert.deepEqual(validateCampaignDraft({ ...fixed, title: "  Велодорожки  " }), {
      ok: true,
      args: ["Велодорожки", "Открытая карта", 50_000_000_000_000_000n, 0, 30n],
    });
  });

  it("всегда передаёт нулевой срок для open-ended, даже с мусором в поле", () => {
    assert.deepEqual(validateCampaignDraft({ ...fixed, fundingMode: "openEnded", durationDays: "abc" }), {
      ok: true,
      args: ["Велодорожки", "Открытая карта", 50_000_000_000_000_000n, 1, 0n],
    });
  });

  it("считает лимит названия в байтах UTF-8", () => {
    assert.equal(validateCampaignDraft({ ...fixed, title: "я".repeat(50) }).ok, true);
    assert.deepEqual(errorsOf({ ...fixed, title: `${"я".repeat(50)}a` }), { title: "Не больше 100 байт" });
  });

  it("не принимает пустые и пробельные тексты", () => {
    assert.deepEqual(errorsOf({ ...fixed, title: "   ", description: "" }), {
      title: "Введите название",
      description: "Опишите проект",
    });
  });

  it("ограничивает описание 1000 байтами", () => {
    assert.deepEqual(errorsOf({ ...fixed, description: "я".repeat(501) }), { description: "Не больше 1000 байт" });
  });

  it("принимает срок от 1 до 365 целых дней", () => {
    assert.equal(validateCampaignDraft({ ...fixed, durationDays: "1" }).ok, true);
    assert.equal(validateCampaignDraft({ ...fixed, durationDays: "365" }).ok, true);
    for (const durationDays of ["0", "366", "1.5", "1e2", ""]) {
      assert.deepEqual(errorsOf({ ...fixed, durationDays }), {
        durationDays: "Срок — целое число дней от 1 до 365",
      });
    }
  });

  it("берёт текст ошибки цели из parseEthAmount", () => {
    assert.deepEqual(errorsOf({ ...fixed, goal: "0" }), { goal: "Сумма должна быть больше нуля" });
  });

  it("собирает все ошибки сразу", () => {
    assert.deepEqual(Object.keys(errorsOf({ ...fixed, title: "", goal: "abc", durationDays: "0" })), [
      "title",
      "goal",
      "durationDays",
    ]);
  });
});
