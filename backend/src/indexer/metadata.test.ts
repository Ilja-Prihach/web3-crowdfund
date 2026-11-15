import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPublicClient, custom, http, parseEther } from "viem";

import { createChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import { anvilAccounts, useAnvil } from "../test/anvil.ts";
import { deployCrowdfunding } from "../test/crowdfunding.ts";
import type { IndexedContract } from "./events.ts";
import { readCampaignMetadata } from "./metadata.ts";

const [creator] = anvilAccounts;

const stand = useAnvil(async ({ client }) => {
  const campaign = await deployCrowdfunding(client, creator);
  const contract: IndexedContract = {
    chainId: await client.getChainId(),
    address: campaign.address,
    deployBlock: await client.getBlockNumber({ cacheTime: 0 }),
  };
  return { campaign, contract };
});

// Клиент к Anvil, который считает вызовы eth_call.
function countingClient() {
  const node = http(stand.anvil.url)({ chain: crowdfunding.chain });
  const calls: string[] = [];
  const chain = createPublicClient({
    chain: crowdfunding.chain,
    transport: custom({
      request: (args: { method: string; params?: unknown }) => {
        calls.push(args.method);
        return node.request(args);
      },
    }),
  });
  return { chain, calls };
}

const latest = () => stand.anvil.client.getBlockNumber({ cacheTime: 0 });

describe("readCampaignMetadata", () => {
  it("читает название, описание и режим сбора кампаний", async () => {
    const { campaign, contract } = stand.context;
    await campaign.createCampaign(creator, { goal: parseEther("1"), title: "Лекторий", description: "Сбор на зал" });
    await campaign.createCampaign(creator, { goal: parseEther("1"), mode: "open", title: "Open", description: "No deadline" });

    const rows = await readCampaignMetadata(createChainClient(stand.anvil.url), contract, [1n, 0n], await latest());

    assert.deepEqual(rows, [
      {
        chainId: contract.chainId,
        contractAddress: contract.address.toLowerCase(),
        campaignId: 0n,
        fundingMode: "fixed_deadline",
        title: "Лекторий",
        description: "Сбор на зал",
      },
      {
        chainId: contract.chainId,
        contractAddress: contract.address.toLowerCase(),
        campaignId: 1n,
        fundingMode: "open_ended",
        title: "Open",
        description: "No deadline",
      },
    ]);
  });

  it("читает подряд идущие id страницами по 20, пропуск начинает новую страницу", async () => {
    const { campaign, contract } = stand.context;
    for (let index = 0; index < 22; index++) await campaign.createCampaign(creator, { goal: 1n, title: `C${index}` });
    // Все id, кроме 10, с повтором: страницы 0..9 и 11..21 — два вызова.
    const ids = Array.from({ length: 22 }, (_, index) => BigInt(index)).filter((id) => id !== 10n);
    const { chain, calls } = countingClient();

    const rows = await readCampaignMetadata(chain, contract, [...ids, 5n], await latest());

    assert.deepEqual(
      rows.map((row) => row.campaignId),
      ids,
    );
    assert.equal(calls.filter((method) => method === "eth_call").length, 2);
  });

  it("на блоке до создания кампании — ошибка, а не пустые метаданные", async () => {
    const { campaign, contract } = stand.context;
    const before = await latest();
    await campaign.createCampaign(creator, { goal: 1n });

    await assert.rejects(
      readCampaignMetadata(createChainClient(stand.anvil.url), contract, [0n], before),
      new RegExp(`Campaigns 0..0 do not exist at block ${before}`),
    );
  });
});
