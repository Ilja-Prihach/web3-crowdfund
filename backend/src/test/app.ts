import { createPublicClient, custom } from "viem";

import type { AppDeps } from "../app.ts";
import type { ChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import type { Database } from "../db/client.ts";

export const testAppOrigin = "http://localhost:3000";

type RpcBehaviour = "rejects-signatures" | "unreachable";

// Узел без сети. "rejects-signatures" отвечает на eth_call валидатора подписей false, как Sepolia
// на чужую подпись; "unreachable" имитирует упавший RPC. Число вызовов видно в calls.
export function createTestChain(behaviour: RpcBehaviour = "rejects-signatures") {
  const calls: string[] = [];
  const chain: ChainClient = createPublicClient({
    chain: crowdfunding.chain,
    transport: custom(
      {
        request: ({ method }: { method: string }) => {
          calls.push(method);
          if (behaviour === "unreachable") return Promise.reject(new Error("connect ECONNREFUSED"));
          if (method === "eth_call") return Promise.resolve(`0x${"0".repeat(64)}`);
          return Promise.reject(new Error(`unexpected RPC method ${method}`));
        },
      },
      { retryCount: 0 },
    ),
  });
  return { chain, calls };
}

export function testDeps(db: Database, overrides: Partial<AppDeps> = {}): AppDeps {
  return { db, chain: createTestChain().chain, appOrigin: testAppOrigin, ...overrides };
}
