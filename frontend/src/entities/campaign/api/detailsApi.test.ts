import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { BackendApiError } from "../../../shared/api/backend.ts";
import { fetchCampaignDetails, fromDetailsJson, hasDetailsSections, parseCoverUrl } from "./detailsApi.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const coverPath = `/v1/media/covers/${"a".repeat(64)}.webp`;

const filled = {
  category: "education",
  story: "Первый абзац.\n\nВторой абзац.",
  // Больше 2^53: через Number цифры бы исказились.
  budget: [{ label: "Аренда зала", amount: (2n ** 200n + 1n).toString() }],
  plan: [{ period: "Декабрь", task: "Четыре лекции" }],
  risks: "Зал могут не дать.",
  coverUrl: coverPath,
  updatedAt: "2026-11-20T15:00:00.000Z",
};
const empty = { category: null, story: null, budget: null, plan: null, risks: null, coverUrl: null, updatedAt: null };

const isInvalid = (error: unknown) => error instanceof BackendApiError && error.code === "INVALID_RESPONSE";

describe("fromDetailsJson", () => {
  it("переводит суммы бюджета в bigint, время — в Date, обложку — в адрес через /api", () => {
    assert.deepEqual(fromDetailsJson(filled), {
      category: "education",
      story: "Первый абзац.\n\nВторой абзац.",
      budget: [{ label: "Аренда зала", amount: 2n ** 200n + 1n }],
      plan: [{ period: "Декабрь", task: "Четыре лекции" }],
      risks: "Зал могут не дать.",
      coverUrl: `/api${coverPath}`,
      updatedAt: new Date("2026-11-20T15:00:00.000Z"),
    });
  });

  it("создатель ничего не заполнял — все поля null и разделов нет", () => {
    const details = fromDetailsJson(empty);

    assert.deepEqual(Object.values(details), Array(7).fill(null));
    assert.equal(hasDetailsSections(details), false);
    assert.equal(hasDetailsSections({ ...details, risks: "Риск" }), true);
    assert.equal(hasDetailsSections({ ...details, coverUrl: "/api/x.webp", category: "apps" }), false, "обложка и категория — шапка");
  });

  it("отклоняет незнакомую категорию, кривую сумму и битую дату", () => {
    assert.throws(() => fromDetailsJson({ ...filled, category: "games" }), isInvalid);
    assert.throws(() => fromDetailsJson({ ...filled, budget: [{ label: "Зал", amount: "0.5" }] }), isInvalid);
    assert.throws(() => fromDetailsJson({ ...filled, budget: "много" as unknown as [] }), isInvalid);
    assert.throws(() => fromDetailsJson({ ...filled, updatedAt: "вчера" }), isInvalid);
  });
});

describe("parseCoverUrl", () => {
  it("пускает в <img> только файл обложки нашего backend", () => {
    assert.equal(parseCoverUrl(coverPath), `/api${coverPath}`);
    assert.equal(parseCoverUrl(null), null);
    for (const foreign of [
      "https://tracker.example/pixel.gif",
      "javascript:alert(1)",
      "data:image/svg+xml,<svg onload=alert(1)>",
      "/v1/media/covers/../../auth/session",
      `//evil.example${coverPath}`,
    ]) {
      assert.throws(() => parseCoverUrl(foreign), isInvalid, foreign);
    }
  });
});

describe("fetchCampaignDetails", () => {
  it("запрашивает детали кампании у backend своего источника", async () => {
    const urls: string[] = [];
    globalThis.fetch = (url) => {
      urls.push(String(url));
      return Promise.resolve(new Response(JSON.stringify(empty), { status: 200 }));
    };

    const details = await fetchCampaignDetails(7n);

    assert.deepEqual(urls, ["/api/v1/campaigns/7/details"]);
    assert.equal(details.story, null);
  });
});
