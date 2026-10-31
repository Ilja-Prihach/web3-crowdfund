import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type CatalogOrder, getPageCount, getPageWindow } from "./pagination.ts";

const orders: CatalogOrder[] = ["newest", "oldest"];

// Собирает ID всех страниц подряд, как их увидит пользователь при листании.
function collectIds(total: bigint, order: CatalogOrder) {
  const ids: bigint[] = [];
  for (let page = 0; page < getPageCount(total); page++) {
    const window = getPageWindow(total, page, order);
    assert.ok(window, `страница ${page} должна существовать`);
    for (let id = window.offset; id < window.offset + window.limit; id++) ids.push(id);
  }
  return ids;
}

describe("getPageWindow", () => {
  it("не возвращает окон, когда кампаний нет", () => {
    for (const order of orders) assert.equal(getPageWindow(0n, 0, order), null);
  });

  it("читает обе кампании одной страницей", () => {
    for (const order of orders) assert.deepEqual(getPageWindow(2n, 0, order), { offset: 0n, limit: 2n });
  });

  it("отсчитывает новые кампании с конца", () => {
    assert.deepEqual(getPageWindow(45n, 0, "newest"), { offset: 25n, limit: 20n });
    assert.deepEqual(getPageWindow(45n, 1, "newest"), { offset: 5n, limit: 20n });
    assert.deepEqual(getPageWindow(45n, 2, "newest"), { offset: 0n, limit: 5n });
    assert.equal(getPageWindow(45n, 3, "newest"), null);
  });

  it("отсчитывает старые кампании с начала", () => {
    assert.deepEqual(getPageWindow(45n, 0, "oldest"), { offset: 0n, limit: 20n });
    assert.deepEqual(getPageWindow(45n, 1, "oldest"), { offset: 20n, limit: 20n });
    assert.deepEqual(getPageWindow(45n, 2, "oldest"), { offset: 40n, limit: 5n });
    assert.equal(getPageWindow(45n, 3, "oldest"), null);
  });

  it("не создаёт пустую страницу после ровно заполненной", () => {
    for (const order of orders) {
      assert.deepEqual(getPageWindow(20n, 0, order), { offset: 0n, limit: 20n });
      assert.equal(getPageWindow(20n, 1, order), null);
    }
  });

  it("покрывает все ID без пересечений и пропусков", () => {
    for (const order of orders) {
      const ids = collectIds(45n, order).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      assert.deepEqual(ids, Array.from({ length: 45 }, (_, id) => BigInt(id)));
    }
  });
});

describe("getPageCount", () => {
  it("округляет число страниц вверх", () => {
    assert.equal(getPageCount(0n), 0);
    assert.equal(getPageCount(2n), 1);
    assert.equal(getPageCount(20n), 1);
    assert.equal(getPageCount(45n), 3);
  });
});
