import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseEther } from "viem";

import { BackendApiError } from "../../../shared/api/backend.ts";
import type { ActivityItem, Donor } from "../api/historyApi.ts";
import {
  classifyHistoryError,
  describeActivity,
  donorsPageLimit,
  formatEventTime,
  formatEventTimeFull,
  isContributionPending,
  mergeDonorPages,
  nextDonorsOffset,
} from "./history.ts";

const event = (overrides: Partial<ActivityItem>): ActivityItem => ({
  type: "donation",
  actor: "0x012E40523eAca6BEd2e8205A05eC7e6281dB5Ef5",
  amount: null,
  deadline: null,
  blockNumber: 12_148_563n,
  blockTimestamp: null,
  txHash: `0x${"ab".repeat(32)}`,
  logIndex: 0,
  ...overrides,
});

const donor = (address: string, amount: string): Donor => ({
  donor: address as Donor["donor"],
  amount: parseEther(amount),
  donated: parseEther(amount),
  refunded: 0n,
  donations: 1,
});

describe("describeActivity", () => {
  it("описывает каждое событие V2 своим глаголом и суммой", () => {
    const december18 = 1_797_552_000n;
    assert.deepEqual(
      [
        event({ type: "created", deadline: december18 }),
        event({ type: "created" }),
        event({ type: "deadline_updated", deadline: december18 }),
        event({ type: "donation", amount: parseEther("0.2") }),
        event({ type: "refund", amount: parseEther("0.1") }),
        event({ type: "cancelled" }),
        event({ type: "withdrawn", amount: parseEther("0.5") }),
      ].map(describeActivity),
      [
        "создал сбор до 18 декабря 2026",
        "создал сбор без срока",
        "изменил срок: 18 декабря 2026",
        "поддержал на 0,2 ETH",
        "вернул вклад 0,1 ETH",
        "отменил сбор",
        "вывел 0,5 ETH",
      ],
    );
  });
});

describe("formatEventTime", () => {
  it("показывает дату и время в часовом поясе посетителя, полную дату — для подсказки", () => {
    const time = new Date("2026-11-16T14:32:12Z");

    assert.equal(formatEventTime(time, "UTC"), "16 нояб., 14:32");
    assert.equal(formatEventTime(time, "Europe/Minsk"), "16 нояб., 17:32");
    assert.equal(formatEventTimeFull(time, "UTC"), "16 ноября 2026 г. в 14:32:12");
  });
});

describe("classifyHistoryError", () => {
  it("404 CAMPAIGN_NOT_FOUND — кампания ещё не дочитана indexer, остальное — backend недоступен", () => {
    assert.equal(classifyHistoryError(new BackendApiError(404, "CAMPAIGN_NOT_FOUND")), "not-indexed");
    // Прокси Next без маршрута — тоже 404, но это не «indexer отстаёт».
    assert.equal(classifyHistoryError(new BackendApiError(404, "UNKNOWN_ERROR")), "unavailable");
    assert.equal(classifyHistoryError(new BackendApiError(0, "TIMEOUT")), "unavailable");
    assert.equal(classifyHistoryError(new BackendApiError(200, "INVALID_RESPONSE")), "unavailable");
    assert.equal(classifyHistoryError(new TypeError("boom")), "unavailable");
  });
});

describe("страницы донатеров", () => {
  it("сначала топ из 5, затем по 10, пока не загружены все", () => {
    assert.deepEqual([donorsPageLimit(0), donorsPageLimit(5), donorsPageLimit(15)], [5, 10, 10]);

    const five = Array.from({ length: 5 }, (_, index) => donor(`0x${String(index).repeat(40)}`, "0.1"));
    assert.equal(nextDonorsOffset([{ items: five, total: 12 }]), 5);
    assert.equal(nextDonorsOffset([{ items: five, total: 12 }, { items: [...five, ...five.slice(0, 2)], total: 12 }]), undefined);
    assert.equal(nextDonorsOffset([{ items: five, total: 5 }]), undefined);
    assert.equal(nextDonorsOffset([]), undefined);
  });

  it("адрес, сдвинутый новым вкладом на следующую страницу, показывается один раз", () => {
    const alice = "0xa11ce00000000000000000000000000000000001";
    const bob = "0xb0b0000000000000000000000000000000000002";
    const carol = "0xca10100000000000000000000000000000000003";

    const merged = mergeDonorPages([{ items: [donor(alice, "0.5"), donor(bob, "0.3")] }, { items: [donor(bob, "0.3"), donor(carol, "0.1")] }]);

    assert.deepEqual(merged.map((item) => item.donor), [alice, bob, carol]);
  });
});

describe("isContributionPending", () => {
  it("вклад есть в контракте, но в истории его нет или он другой — indexer отстаёт", () => {
    const onChain = parseEther("0.3");

    assert.equal(isContributionPending({ onChain, listed: undefined, listComplete: true }), true, "адреса нет в полном списке");
    assert.equal(isContributionPending({ onChain, listed: parseEther("0.1"), listComplete: false }), true, "довнёс после финализации");
    assert.equal(isContributionPending({ onChain, listed: onChain, listComplete: false }), false, "история догнала контракт");
    assert.equal(isContributionPending({ onChain, listed: undefined, listComplete: false }), false, "список не дочитан: не знаем");
    assert.equal(isContributionPending({ onChain: 0n, listed: undefined, listComplete: true }), false, "вклада нет");
    assert.equal(isContributionPending({ onChain: undefined, listed: undefined, listComplete: true }), false, "кошелёк не подключён");
    // Вернул вклад, а indexer ещё помнит его: история тоже отстаёт.
    assert.equal(isContributionPending({ onChain: 0n, listed: onChain, listComplete: true }), true, "возврат ещё не виден");
  });
});
