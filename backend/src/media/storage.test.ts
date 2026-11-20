import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { createLocalMediaStorage } from "./storage.ts";

describe("createLocalMediaStorage", () => {
  let root = "";
  before(async () => {
    root = await mkdtemp(join(tmpdir(), "openfund-media-"));
  });
  after(() => rm(root, { recursive: true, force: true }));

  const key = `covers/${"a".repeat(64)}.webp`;

  it("сохраняет, читает и удаляет файл по ключу", async () => {
    const storage = createLocalMediaStorage(root);
    await storage.put(key, Buffer.from("webp"));

    assert.deepEqual(await storage.get(key), Buffer.from("webp"));
    // Временный файл после rename не остаётся.
    assert.deepEqual(await readdir(join(root, "covers")), [`${"a".repeat(64)}.webp`]);

    await storage.delete(key);
    assert.equal(await storage.get(key), null);
    await storage.delete(key);
  });

  it("не принимает ключи вне формата «папка/sha256.webp»", async () => {
    const storage = createLocalMediaStorage(root);
    for (const bad of ["../escape.webp", `covers/../${"a".repeat(64)}.webp`, "/etc/passwd", `covers/${"a".repeat(64)}.png`]) {
      await assert.rejects(storage.put(bad, Buffer.from("x")), /Invalid media key/, bad);
      await assert.rejects(storage.get(bad), /Invalid media key/, bad);
    }
  });
});
