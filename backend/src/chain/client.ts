import { createPublicClient, http } from "viem";

import { crowdfunding } from "./contract.ts";

// Клиент чтения Sepolia. URL может содержать ключ провайдера: он не логируется и передаётся зависимостью.
export function createChainClient(rpcUrl: string) {
  return createPublicClient({
    chain: crowdfunding.chain,
    transport: http(rpcUrl, { timeout: 15_000, retryCount: 2 }),
  });
}

export type ChainClient = ReturnType<typeof createChainClient>;
