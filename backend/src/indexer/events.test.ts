import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPublicClient, custom, http, parseEther } from "viem";

import { createChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import { anvilAccounts, useAnvil } from "../test/anvil.ts";
import { deployCrowdfunding } from "../test/crowdfunding.ts";
import { type IndexedContract, readContractEvents } from "./events.ts";

const [creator, donor] = anvilAccounts;

const stand = useAnvil(async ({ client }) => {
  const campaign = await deployCrowdfunding(client, creator);
  const contract: IndexedContract = {
    chainId: await client.getChainId(),
    address: campaign.address,
    deployBlock: await client.getBlockNumber({ cacheTime: 0 }),
  };
  return { campaign, contract };
});

describe("readContractEvents", () => {
  it("читает все события V2 и превращает их в строки chain_events", async () => {
    const { campaign, contract } = stand.context;
    const fixed = await campaign.createCampaign(creator, { goal: parseEther("1"), days: 7 });
    await campaign.updateDeadline(creator, fixed.campaignId, 10);
    await campaign.donate(donor, fixed.campaignId, parseEther("0.4"));
    await campaign.cancel(creator, fixed.campaignId);
    await campaign.refund(donor, fixed.campaignId);
    const open = await campaign.createCampaign(creator, { goal: parseEther("0.5"), mode: "open" });
    await campaign.donate(donor, open.campaignId, parseEther("0.5"));
    await campaign.withdraw(creator, open.campaignId);

    const chain = createChainClient(stand.anvil.url);
    const rows = await readContractEvents(chain, contract, contract.deployBlock, await chain.getBlockNumber());

    assert.deepEqual(
      rows.map((row) => row.eventName),
      [
        "CampaignCreated",
        "CampaignDeadlineUpdated",
        "DonationMade",
        "CampaignCancelled",
        "RefundClaimed",
        "CampaignCreated",
        "DonationMade",
        "FundsWithdrawn",
      ],
    );
    const donation = rows[2];
    assert.equal(donation?.chainId, 11_155_111);
    assert.equal(donation?.contractAddress, contract.address.toLowerCase());
    assert.equal(donation?.campaignId, 0n);
    assert.deepEqual(donation?.args, { donor: donor.address.toLowerCase(), amount: parseEther("0.4").toString() });
    assert.match(donation?.txHash ?? "", /^0x[0-9a-f]{64}$/);
    const block = await chain.getBlock({ blockNumber: donation?.blockNumber ?? 0n });
    assert.deepEqual(donation?.blockTimestamp, new Date(Number(block.timestamp) * 1000), "время блока из лога");
  });

  it("берёт время из блока, если узел не прислал blockTimestamp в логе, — один запрос на блок", async () => {
    const { campaign, contract } = stand.context;
    const created = await campaign.createCampaign(creator, { goal: parseEther("1") });
    await campaign.donate(donor, created.campaignId, parseEther("0.1"));
    // Узел, который отвечает как старый geth: логи без blockTimestamp.
    const node = http(stand.anvil.url)({ chain: crowdfunding.chain });
    const calls: string[] = [];
    const chain = createPublicClient({
      chain: crowdfunding.chain,
      transport: custom({
        request: async (args: { method: string; params?: unknown }) => {
          calls.push(args.method);
          const result: unknown = await node.request(args);
          if (args.method !== "eth_getLogs" || !Array.isArray(result)) return result;
          return result.map((log: Record<string, unknown>) => {
            const { blockTimestamp, ...rest } = log;
            void blockTimestamp;
            return rest;
          });
        },
      }),
    });

    const rows = await readContractEvents(chain, contract, contract.deployBlock, await chain.getBlockNumber());

    assert.equal(rows.length, 2);
    assert.ok(rows.every((row) => row.blockTimestamp instanceof Date));
    // Создание и вклад — в разных блоках: два getBlock, не больше.
    assert.equal(calls.filter((method) => method === "eth_getBlockByNumber").length, 2);
  });

  it("читает только указанный диапазон блоков включительно", async () => {
    const { campaign, contract } = stand.context;
    const chain = createChainClient(stand.anvil.url);
    await campaign.createCampaign(creator, { goal: parseEther("1") });
    const firstBlock = await chain.getBlockNumber();
    await campaign.createCampaign(creator, { goal: parseEther("2") });

    const onlyFirst = await readContractEvents(chain, contract, contract.deployBlock, firstBlock);
    const onlySecond = await readContractEvents(chain, contract, firstBlock + 1n, firstBlock + 1n);

    assert.deepEqual(onlyFirst.map((row) => row.campaignId), [0n]);
    assert.deepEqual(onlySecond.map((row) => row.campaignId), [1n]);
  });

  it("не путает контракты: события другого адреса не попадают", async () => {
    const { contract } = stand.context;
    const other = await deployCrowdfunding(stand.anvil.client, creator);
    await other.createCampaign(creator, { goal: parseEther("1") });
    const chain = createChainClient(stand.anvil.url);

    assert.deepEqual(await readContractEvents(chain, contract, contract.deployBlock, await chain.getBlockNumber()), []);
  });
});
