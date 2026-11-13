import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPublicClient, custom, http, RpcRequestError } from "viem";

import { createChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import { anvilAccounts, useAnvil } from "../test/anvil.ts";
import { deployCrowdfunding } from "../test/crowdfunding.ts";
import type { IndexedContract } from "./events.ts";
import { checkNode } from "./startup.ts";

const [creator] = anvilAccounts;

const stand = useAnvil(async ({ client }) => {
  const campaign = await deployCrowdfunding(client, creator);
  const contract: IndexedContract = {
    chainId: await client.getChainId(),
    address: campaign.address,
    deployBlock: await client.getBlockNumber({ cacheTime: 0 }),
  };
  return contract;
});

// Узел, который отвечает как publicnode на старые блоки: eth_getLogs → 4444 pruned history.
// failures — сколько первых eth_getLogs отклонить; по умолчанию все, как узел без истории.
function prunedNode(url: string, failures = Number.POSITIVE_INFINITY) {
  const node = http(url)({ chain: crowdfunding.chain });
  let rejected = 0;
  return createPublicClient({
    chain: crowdfunding.chain,
    transport: custom(
      {
        request: (args: { method: string; params?: unknown }) =>
          args.method === "eth_getLogs" && rejected++ < failures
            ? Promise.reject(
                new RpcRequestError({
                  url: "https://sepolia.example/v3/secret-key",
                  body: args,
                  error: { code: 4444, message: "pruned history unavailable" },
                }),
              )
            : node.request(args),
      },
      { retryCount: 0 },
    ),
  });
}

describe("checkNode", () => {
  it("пропускает узел нужной сети с историей от блока deploy", async () => {
    await checkNode(createChainClient(stand.anvil.url), stand.context, 50n);
  });

  it("останавливает indexer, если узел из другой сети", async () => {
    const mainnetContract = { ...stand.context, chainId: 1 };

    await assert.rejects(
      checkNode(createChainClient(stand.anvil.url), mainnetContract, 50n),
      /SEPOLIA_RPC_URL points to chain 11155111, expected 1/,
    );
  });

  it("останавливает indexer на узле с обрезанной историей и не выдаёт его URL", async () => {
    const options = { attempts: 3, retryDelayMs: 0 };
    await assert.rejects(checkNode(prunedNode(stand.anvil.url), stand.context, 50n, options), (error: Error) => {
      assert.match(error.message, /does not return logs from deploy block \d+ after 3 attempts/);
      assert.match(error.message, /pruned history unavailable/);
      assert.ok(!error.message.includes("secret-key"), "URL узла не попал в сообщение");
      return true;
    });
  });

  it("не останавливает indexer из-за случайного отказа одного узла за балансировщиком", async () => {
    const options = { attempts: 3, retryDelayMs: 0 };

    await checkNode(prunedNode(stand.anvil.url, 2), stand.context, 50n, options);
  });
});
