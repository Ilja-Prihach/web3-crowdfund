import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { BackendApiError } from "../../../shared/api/backend.ts";
import { catalogSearchParams, fetchCatalog, fromCampaignJson } from "./catalogApi.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(status: number, body?: unknown) {
  const urls: string[] = [];
  globalThis.fetch = (url) => {
    urls.push(String(url));
    return Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status }));
  };
  return urls;
}

const openEnded = {
  id: "3",
  creator: "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5",
  fundingMode: "open_ended",
  title: "Библиотека инструментов",
  description: "Открытый сбор",
  // Больше 2^53: через Number цифры бы исказились.
  goal: (2n ** 200n + 1n).toString(),
  deadline: null,
  totalRaised: "6000000000000000",
  status: "active",
  createdBlock: "12034567",
  donors: 2,
} as const;

const params = { sort: "newest", page: 0, pageSize: 20 } as const;

describe("catalogSearchParams", () => {
  it("переводит фильтры каталога в параметры API", () => {
    const search = catalogSearchParams({
      query: "  датчики  ",
      statuses: ["successful", "failed"],
      mode: "openEnded",
      sort: "raised",
      page: 2,
      pageSize: 20,
    });

    assert.equal(
      search.toString(),
      "q=%D0%B4%D0%B0%D1%82%D1%87%D0%B8%D0%BA%D0%B8&status=successful&status=failed&mode=open_ended&sort=raised&limit=20&offset=40",
    );
  });

  it("не отправляет пустой поиск и пустые фильтры", () => {
    assert.equal(catalogSearchParams({ ...params, query: "   ", statuses: [] }).toString(), "sort=newest&limit=20&offset=0");
  });
});

describe("fromCampaignJson", () => {
  it("превращает ответ backend в ту же Campaign, что из контракта", () => {
    assert.deepEqual(fromCampaignJson(openEnded), {
      id: 3n,
      creator: "0x012E40523eAca6BEd2e8205A05eC7e6281dB5Ef5",
      title: "Библиотека инструментов",
      description: "Открытый сбор",
      goal: 2n ** 200n + 1n,
      deadline: 0n,
      totalRaised: 6_000_000_000_000_000n,
      fundingMode: "openEnded",
      status: "active",
      donors: 2,
    });
    assert.equal(fromCampaignJson({ ...openEnded, fundingMode: "fixed_deadline", deadline: "1796042148" }).deadline, 1_796_042_148n);
  });

  it("отклоняет незнакомый статус, режим и кривой адрес", () => {
    assert.throws(() => fromCampaignJson({ ...openEnded, status: "paused" }), BackendApiError);
    assert.throws(() => fromCampaignJson({ ...openEnded, creator: "0x123" }), BackendApiError);
    assert.throws(() => fromCampaignJson({ ...openEnded, fundingMode: "flexible" as "open_ended" }), BackendApiError);
  });
});

describe("fetchCatalog", () => {
  it("ходит на /api/v1/campaigns своего источника и отдаёт кампании, total и блок данных", async () => {
    const urls = mockFetch(200, { items: [openEnded], total: 10, limit: 20, offset: 0, finalizedBlock: "12142223" });

    const result = await fetchCatalog(params);

    assert.equal(urls[0], "/api/v1/campaigns?sort=newest&limit=20&offset=0");
    assert.equal(result.campaigns[0]?.id, 3n);
    assert.equal(result.total, 10);
    assert.equal(result.finalizedBlock, 12_142_223n);
  });

  it("передаёт null блока, если indexer ещё не запускался", async () => {
    mockFetch(200, { items: [], total: 0, limit: 20, offset: 0, finalizedBlock: null });

    assert.equal((await fetchCatalog(params)).finalizedBlock, null);
  });

  it("ошибка backend — BackendApiError с его кодом, недоступность — NETWORK_ERROR", async () => {
    mockFetch(429, { error: { code: "RATE_LIMITED", message: "Rate limit exceeded" } });
    await assert.rejects(fetchCatalog(params), (error) => error instanceof BackendApiError && error.code === "RATE_LIMITED");

    // Прокси Next без backend отвечает 500 с HTML: тело не JSON.
    globalThis.fetch = () => Promise.resolve(new Response("<html>Internal Server Error</html>", { status: 500 }));
    await assert.rejects(fetchCatalog(params), (error) => error instanceof BackendApiError && error.status === 500);

    globalThis.fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    await assert.rejects(fetchCatalog(params), (error) => error instanceof BackendApiError && error.code === "NETWORK_ERROR");
  });

  it("обрывает зависший запрос по таймауту", async () => {
    // fetch, который отвечает только отменой.
    globalThis.fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)));

    await assert.rejects(fetchCatalog(params, undefined, 20), (error) => error instanceof BackendApiError && error.code === "TIMEOUT");
  });

  it("отмена снаружи — ABORTED, а не таймаут", async () => {
    globalThis.fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)));
    const controller = new AbortController();

    const request = fetchCatalog(params, controller.signal, 5_000);
    controller.abort();

    await assert.rejects(request, (error) => error instanceof BackendApiError && error.code === "ABORTED");
  });
});
