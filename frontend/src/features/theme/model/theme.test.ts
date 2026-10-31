import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getNextTheme, isTheme } from "./theme.ts";

describe("theme", () => {
  it("распознаёт только поддерживаемые темы", () => {
    assert.equal(isTheme("light"), true);
    assert.equal(isTheme("dark"), true);
    assert.equal(isTheme("system"), false);
    assert.equal(isTheme(null), false);
  });

  it("переключает светлую и тёмную темы", () => {
    assert.equal(getNextTheme("light"), "dark");
    assert.equal(getNextTheme("dark"), "light");
  });
});
