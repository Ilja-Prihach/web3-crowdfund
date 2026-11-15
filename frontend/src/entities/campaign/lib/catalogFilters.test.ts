import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Campaign } from "../model/campaign.ts";
import { chooseCatalogSource, defaultCatalogFilters, matchesFilters, toCatalogParams } from "./catalogFilters.ts";

const campaign = (overrides: Partial<Campaign>): Campaign => ({
  id: 0n,
  creator: "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5",
  title: "Кампания",
  description: "Описание",
  goal: 1n,
  deadline: 0n,
  totalRaised: 0n,
  fundingMode: "openEnded",
  status: "active",
  ...overrides,
});

describe("toCatalogParams", () => {
  it("«Идёт сбор» — один статус, «Завершены» — четыре остальных, «Все» — без фильтра", () => {
    const params = (status: "all" | "active" | "finished") =>
      toCatalogParams({ ...defaultCatalogFilters, status }, 0, 20).statuses;

    assert.equal(params("all"), undefined);
    assert.deepEqual(params("active"), ["active"]);
    assert.deepEqual(params("finished"), ["successful", "failed", "withdrawn", "cancelled"]);
  });

  it("передаёт поиск, режим, сортировку и страницу", () => {
    assert.deepEqual(toCatalogParams({ query: "датчики", status: "all", mode: "fixedDeadline", sort: "raised" }, 2, 20), {
      query: "датчики",
      statuses: undefined,
      mode: "fixedDeadline",
      sort: "raised",
      page: 2,
      pageSize: 20,
    });
  });
});

describe("matchesFilters", () => {
  it("фильтрует страницу контракта по состоянию и типу сбора", () => {
    const failed = campaign({ status: "failed", fundingMode: "fixedDeadline" });

    assert.equal(matchesFilters(failed, defaultCatalogFilters), true);
    assert.equal(matchesFilters(failed, { ...defaultCatalogFilters, status: "finished" }), true);
    assert.equal(matchesFilters(failed, { ...defaultCatalogFilters, status: "active" }), false);
    assert.equal(matchesFilters(failed, { ...defaultCatalogFilters, mode: "openEnded" }), false);
  });
});

describe("chooseCatalogSource", () => {
  it("пока backend отвечает — ждём, ответил с блоком — backend", () => {
    assert.equal(chooseCatalogSource({ status: "pending" }), "pending");
    assert.equal(chooseCatalogSource({ status: "success", finalizedBlock: 12_142_223n }), "backend");
  });

  it("ошибка backend или ещё не запускавшийся indexer — откат на контракт", () => {
    assert.equal(chooseCatalogSource({ status: "error" }), "contract");
    assert.equal(chooseCatalogSource({ status: "success", finalizedBlock: null }), "contract");
  });
});
