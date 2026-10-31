import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTimeLeft } from "./deadline.ts";

const now = 1_800_000_000;
const hour = 60 * 60;
const day = 24 * hour;

describe("formatTimeLeft", () => {
  it("считает целые дни со склонением", () => {
    assert.equal(formatTimeLeft(BigInt(now + day), now), "1 день");
    assert.equal(formatTimeLeft(BigInt(now + 4 * day + hour), now), "4 дня");
    assert.equal(formatTimeLeft(BigInt(now + 41 * day), now), "41 день");
    assert.equal(formatTimeLeft(BigInt(now + 365 * day), now), "365 дней");
  });

  it("переходит на часы в последние сутки", () => {
    assert.equal(formatTimeLeft(BigInt(now + 23 * hour + 59 * 60), now), "23 ч");
    assert.equal(formatTimeLeft(BigInt(now + 59 * 60), now), "< 1 ч");
  });

  it("возвращает null, когда срок прошёл", () => {
    assert.equal(formatTimeLeft(BigInt(now), now), null);
    assert.equal(formatTimeLeft(BigInt(now - day), now), null);
  });
});
