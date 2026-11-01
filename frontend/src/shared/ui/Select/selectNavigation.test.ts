import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getNextOptionIndex } from "./selectNavigation.ts";

describe("getNextOptionIndex", () => {
  it("двигается по списку в обе стороны", () => {
    assert.equal(getNextOptionIndex(1, 3, 1), 2);
    assert.equal(getNextOptionIndex(1, 3, -1), 0);
  });

  it("зацикливает переходы через границы", () => {
    assert.equal(getNextOptionIndex(2, 3, 1), 0);
    assert.equal(getNextOptionIndex(0, 3, -1), 2);
  });

  it("без вариантов не возвращает несуществующий индекс", () => {
    assert.equal(getNextOptionIndex(0, 0, 1), -1);
  });
});
