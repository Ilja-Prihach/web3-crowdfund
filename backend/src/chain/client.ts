import { createPublicClient, http, type PublicClient, type Transport } from "viem";

import { crowdfunding } from "./contract.ts";

// Клиент чтения Sepolia. URL может содержать ключ провайдера: он не логируется и передаётся зависимостью.
export function createChainClient(rpcUrl: string): ChainClient {
  return createPublicClient({
    chain: crowdfunding.chain,
    transport: http(rpcUrl, { timeout: 15_000, retryCount: 2 }),
  });
}

// Тип описывает возможности клиента, а не транспорт: тест подставляет узел без сети.
export type ChainClient = PublicClient<Transport, typeof crowdfunding.chain>;
