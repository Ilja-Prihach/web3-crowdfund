import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { utf8ByteLength } from "./utf8.ts";

describe("utf8ByteLength", () => {
  it("считает байты UTF-8, а не символы JS", () => {
    assert.equal(utf8ByteLength("Open"), 4);
    assert.equal(utf8ByteLength("Открытая"), 16);
    assert.equal(utf8ByteLength("Велодорожки 🚲 Минска"), 40);
  });
});
