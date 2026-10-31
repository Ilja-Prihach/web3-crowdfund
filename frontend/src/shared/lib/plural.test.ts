import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pluralize } from "./plural.ts";

const forms = ["сбор", "сбора", "сборов"] as const;

describe("pluralize", () => {
  it("выбирает форму по последней цифре", () => {
    assert.deepEqual(
      [0, 1, 2, 4, 5, 21, 22, 25].map((count) => pluralize(count, forms)),
      ["сборов", "сбор", "сбора", "сбора", "сборов", "сбор", "сбора", "сборов"],
    );
  });

  it("использует «сборов» для 11–14 в любой сотне", () => {
    assert.deepEqual(
      [11, 12, 14, 111, 112].map((count) => pluralize(count, forms)),
      ["сборов", "сборов", "сборов", "сборов", "сборов"],
    );
  });
});
