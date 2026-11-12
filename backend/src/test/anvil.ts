import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { after, afterEach, before, beforeEach } from "node:test";

import { createTestClient, type Hex, http, publicActions, walletActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { crowdfunding } from "../chain/contract.ts";

// Первые аккаунты стандартной мнемоники Anvil, у каждого 10 000 ETH. Ключи общеизвестны:
// они живут только в src/test, а тест anvil.test.ts проверяет, что в коде приложения их нет.
export const anvilKeys = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
] as const satisfies readonly Hex[];

export const anvilAccounts = anvilKeys.map((key) => privateKeyToAccount(key));

function createAnvilClient(url: string) {
  // Chain ID Sepolia: тот же клиент и те же проверки, что в приложении, только узел локальный.
  return createTestClient({ chain: crowdfunding.chain, mode: "anvil", transport: http(url) })
    .extend(publicActions)
    .extend(walletActions);
}

export type AnvilClient = ReturnType<typeof createAnvilClient>;

// Ждёт строку «Listening on 127.0.0.1:PORT»: порт 0 означает «любой свободный», его выбирает сам Anvil.
function waitForUrl(child: ChildProcess) {
  return new Promise<string>((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error(`anvil did not start:\n${output}`)), 10_000);
    child.stdout?.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const match = /Listening on (\S+)/.exec(output);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(`http://${match[1]}`);
      }
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`anvil is not installed or failed to start: ${error.message}`));
    });
  });
}

export async function startAnvil() {
  const child = spawn("anvil", ["--port", "0", "--chain-id", String(crowdfunding.chain.id)], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  // Упавший тест не должен оставлять узел висеть после выхода процесса.
  const killOnExit = () => child.kill();
  process.once("exit", killOnExit);

  const url = await waitForUrl(child);
  return {
    url,
    client: createAnvilClient(url),
    stop: async () => {
      process.off("exit", killOnExit);
      child.kill();
      await once(child, "exit");
    },
  };
}

export type Anvil = Awaited<ReturnType<typeof startAnvil>>;

// Один узел на файл тестов. setup выполняется один раз (например, развёртывание контракта),
// а перед каждым тестом снимок состояния и откат после: тест видит ровно состояние после setup.
export function useAnvil<T>(setup: (anvil: Anvil) => Promise<T>) {
  const state = {} as { anvil: Anvil; context: T };
  let snapshot: Hex;

  before(async () => {
    state.anvil = await startAnvil();
    state.context = await setup(state.anvil);
  });
  after(() => state.anvil.stop());
  beforeEach(async () => {
    snapshot = await state.anvil.client.snapshot();
  });
  // Anvil удаляет снимок при откате, поэтому перед следующим тестом снимается новый.
  afterEach(() => state.anvil.client.revert({ id: snapshot }));

  return state;
}
