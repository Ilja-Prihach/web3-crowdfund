import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { decodeEventLog } from "viem";

import { crowdfunding, crowdfundingAddressInDatabase } from "./contract.ts";

const repoRoot = new URL("../../../", import.meta.url);

describe("crowdfunding", () => {
  it("ABI совпадает с ABI frontend", async () => {
    // Обе копии генерирует export-abi.mjs из одной сборки Foundry; расхождение значит, что одну забыли обновить.
    const source = await readFile(new URL("frontend/src/shared/config/crowdfundingAbi.ts", repoRoot), "utf8");
    const json = source.slice(source.indexOf("["), source.lastIndexOf("]") + 1);

    assert.deepEqual(crowdfunding.abi, JSON.parse(json));
  });

  it("адрес, сеть и блок deploy совпадают с docs/deployments.md", async () => {
    const deployments = await readFile(new URL("docs/deployments.md", repoRoot), "utf8");
    const v2 = deployments.slice(deployments.indexOf("### V2"), deployments.indexOf("\n### ", deployments.indexOf("### V2") + 1));

    assert.ok(v2.includes(`- контракт: [\`${crowdfunding.address}\`]`), "адрес контракта");
    assert.ok(v2.includes(`- chain ID: \`${crowdfunding.chain.id}\``), "chain ID");
    assert.ok(v2.includes(`- block: \`${crowdfunding.deployBlock}\``), "блок deploy");
    assert.equal(crowdfundingAddressInDatabase, "0x68905c4394c10c37b1d3b2f7bb3342eaff5a077a");
  });

  it("события ABI совпадают со списком в CHECK таблицы chain_events", () => {
    const events = crowdfunding.abi.filter((item) => item.type === "event").map((item) => item.name);

    assert.deepEqual(events.sort(), [
      "CampaignCancelled",
      "CampaignCreated",
      "CampaignDeadlineUpdated",
      "DonationMade",
      "FundsWithdrawn",
      "RefundClaimed",
    ]);
  });

  it("декодирует настоящий лог вклада в кампанию 7", () => {
    // Транзакция 0x4ff4…e3b5 из docs/deployments.md, лог контракта из её receipt.
    const event = decodeEventLog({
      abi: crowdfunding.abi,
      topics: [
        "0xe555da28bdb778f65d22794d88927ebaeca03f7de9d1b7d39245bc8fb5ca078a",
        "0x0000000000000000000000000000000000000000000000000000000000000007",
        "0x000000000000000000000000012e40523eaca6bed2e8205a05ec7e6281db5ef5",
      ],
      data: "0x00000000000000000000000000000000000000000000000000038d7ea4c68000",
    });

    assert.equal(event.eventName, "DonationMade");
    if (event.eventName !== "DonationMade") return;
    // Сужение по eventName даёт точные типы аргументов: опечатка в имени поля не пройдёт typecheck.
    assert.equal(event.args.campaignId, 7n);
    assert.equal(event.args.donor, "0x012E40523eAca6BEd2e8205A05eC7e6281dB5Ef5");
    assert.equal(event.args.amount, 1_000_000_000_000_000n);
  });
});
