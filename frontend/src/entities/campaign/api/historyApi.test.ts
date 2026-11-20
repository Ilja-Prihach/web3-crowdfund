import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { BackendApiError } from "../../../shared/api/backend.ts";
import { fetchActivity, fetchDonors, fromActivityJson, fromDonorJson } from "./historyApi.ts";

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

const donor = "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5";
const donorChecksum = "0x012E40523eAca6BEd2e8205A05eC7e6281dB5Ef5";
const txHash = `0x${"ab".repeat(32)}`;

const donation = {
  type: "donation",
  actor: donor,
  // Больше 2^53: через Number цифры бы исказились.
  amount: (2n ** 200n + 1n).toString(),
  deadline: null,
  blockNumber: "12148563",
  blockTimestamp: "2026-11-16T14:32:12.000Z",
  txHash,
  logIndex: 3,
} as const;

const donorJson = { donor, amount: "400000000000000000", donated: "500000000000000000", refunded: "100000000000000000", donations: 2 };

const isInvalid = (error: unknown) => error instanceof BackendApiError && error.code === "INVALID_RESPONSE";

describe("fromActivityJson", () => {
  it("переводит строки wei в bigint, время — в Date, адрес — в checksum", () => {
    assert.deepEqual(fromActivityJson(donation), {
      type: "donation",
      actor: donorChecksum,
      amount: 2n ** 200n + 1n,
      deadline: null,
      blockNumber: 12_148_563n,
      blockTimestamp: new Date("2026-11-16T14:32:12.000Z"),
      txHash,
      logIndex: 3,
    });
  });

  it("сохраняет null у события без времени, суммы и автора", () => {
    const cancelled = fromActivityJson({ ...donation, type: "cancelled", actor: null, amount: null, blockTimestamp: null });

    assert.deepEqual(
      { actor: cancelled.actor, amount: cancelled.amount, blockTimestamp: cancelled.blockTimestamp },
      { actor: null, amount: null, blockTimestamp: null },
    );
    assert.equal(fromActivityJson({ ...donation, type: "deadline_updated", deadline: "1796042148" }).deadline, 1_796_042_148n);
  });

  it("отклоняет незнакомый тип, кривые адрес, хэш, сумму и время", () => {
    for (const broken of [
      { ...donation, type: "paused" },
      { ...donation, actor: "0x123" },
      { ...donation, txHash: "0x12" },
      { ...donation, amount: "1.5" },
      { ...donation, amount: "-1" },
      { ...donation, blockNumber: "abc" },
      { ...donation, blockTimestamp: "вчера" },
    ]) {
      assert.throws(() => fromActivityJson(broken), isInvalid, JSON.stringify(broken));
    }
  });
});

describe("fromDonorJson", () => {
  it("переводит суммы донатера в bigint", () => {
    assert.deepEqual(fromDonorJson(donorJson), {
      donor: donorChecksum,
      amount: 400_000_000_000_000_000n,
      donated: 500_000_000_000_000_000n,
      refunded: 100_000_000_000_000_000n,
      donations: 2,
    });
    assert.throws(() => fromDonorJson({ ...donorJson, donated: "" }), isInvalid);
  });
});

describe("fetchActivity", () => {
  it("ходит за лентой кампании и передаёт курсор как есть", async () => {
    const urls = mockFetch(200, { items: [donation], nextCursor: "12148563-3", finalizedBlock: "12148659" });

    const first = await fetchActivity(7n, { limit: 10 });
    await fetchActivity(7n, { limit: 10, before: "12148563-3" });

    assert.deepEqual(urls, ["/api/v1/campaigns/7/activity?limit=10", "/api/v1/campaigns/7/activity?limit=10&before=12148563-3"]);
    assert.equal(first.items[0]?.logIndex, 3);
    assert.equal(first.nextCursor, "12148563-3");
    assert.equal(first.finalizedBlock, 12_148_659n);
  });

  it("неизвестная backend кампания — ошибка 404 с кодом CAMPAIGN_NOT_FOUND", async () => {
    mockFetch(404, { error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaign 99 is not in the catalog" } });

    await assert.rejects(
      fetchActivity(99n, { limit: 10 }),
      (error) => error instanceof BackendApiError && error.status === 404 && error.code === "CAMPAIGN_NOT_FOUND",
    );
  });
});

describe("fetchDonors", () => {
  it("ходит за страницей донатеров и отдаёт число участников", async () => {
    const urls = mockFetch(200, { items: [donorJson], total: 6, limit: 5, offset: 5, finalizedBlock: null });

    const page = await fetchDonors(1n, { limit: 5, offset: 5 });

    assert.equal(urls[0], "/api/v1/campaigns/1/donors?limit=5&offset=5");
    assert.equal(page.items[0]?.amount, 400_000_000_000_000_000n);
    assert.equal(page.total, 6);
    assert.equal(page.finalizedBlock, null);
  });

  it("ответ без списка — INVALID_RESPONSE, а не падение в компоненте", async () => {
    mockFetch(200, { total: 0 });

    await assert.rejects(fetchDonors(1n, { limit: 5, offset: 0 }), isInvalid);
  });
});
