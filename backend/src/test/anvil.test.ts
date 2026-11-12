import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { parseEther } from "viem";

import { anvilAccounts, anvilKeys, useAnvil } from "./anvil.ts";

const stand = useAnvil(() => Promise.resolve(null));
const [alice, bob] = anvilAccounts;

describe("стенд Anvil", () => {
  it("запущен с chain ID Sepolia и тестовыми аккаунтами с балансом", async () => {
    const { client } = stand.anvil;

    assert.equal(await client.getChainId(), 11_155_111);
    assert.equal(await client.getBalance({ address: alice.address }), parseEther("10000"));
  });

  it("изменяет состояние внутри теста: перевод и перемотка времени", async () => {
    const { client } = stand.anvil;
    await client.sendTransaction({ account: alice, to: bob.address, value: parseEther("1") });
    await client.increaseTime({ seconds: 86_400 });
    await client.mine({ blocks: 1 });

    assert.equal(await client.getBalance({ address: bob.address }), parseEther("10001"));
  });

  it("каждый тест начинает с чистого состояния: перевод из прошлого теста откачен", async () => {
    const { client } = stand.anvil;

    assert.equal(await client.getBalance({ address: bob.address }), parseEther("10000"));
    assert.equal(await client.getBlockNumber(), 0n);
  });
});

describe("ключи тестовых аккаунтов", () => {
  it("не встречаются в коде приложения вне src/test", async () => {
    const src = new URL("../", import.meta.url);
    const files = (await readdir(src, { recursive: true })).filter(
      (file) => file.endsWith(".ts") && !file.startsWith("test/"),
    );
    assert.ok(files.length > 10, "файлы приложения найдены");

    for (const file of files) {
      const text = (await readFile(new URL(file, src), "utf8")).toLowerCase();
      for (const key of anvilKeys) assert.ok(!text.includes(key.slice(2)), `${file} содержит ключ Anvil`);
    }
  });
});
