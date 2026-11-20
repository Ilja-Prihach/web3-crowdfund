import { createPublicClient, custom } from "viem";

import type { AppDeps } from "../app.ts";
import type { ChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import type { Database } from "../db/client.ts";
import type { MediaStorage } from "../media/storage.ts";

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

// Хранилище в памяти: тесты маршрутов не пишут на диск. files виден тесту.
export function createMemoryMediaStorage(): MediaStorage & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    put: (key, data) => {
      files.set(key, data);
      return Promise.resolve();
    },
    get: (key) => Promise.resolve(files.get(key) ?? null),
    delete: (key) => {
      files.delete(key);
      return Promise.resolve();
    },
  };
}

export function testDeps(db: Database, overrides: Partial<AppDeps> = {}): AppDeps {
  return { db, chain: createTestChain().chain, appOrigin: testAppOrigin, media: createMemoryMediaStorage(), ...overrides };
}
