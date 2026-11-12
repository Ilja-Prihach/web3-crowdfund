import { readFile } from "node:fs/promises";

import { type Abi, type Account, type Address, type Hex, parseEventLogs } from "viem";

import { crowdfunding } from "../chain/contract.ts";
import type { AnvilClient } from "./anvil.ts";

const contractsOut = new URL("../../../contracts/out/", import.meta.url);

// Артефакт forge build. Свежесть обеспечивает pretest: forge build перед npm test.
export async function readArtifact(file: string, contract: string) {
  const path = new URL(`${file}/${contract}.json`, contractsOut);
  const text = await readFile(path, "utf8").catch(() => {
    throw new Error(`Artifact ${file}/${contract}.json not found: run forge build in contracts/`);
  });
  const artifact = JSON.parse(text) as { abi: Abi; bytecode: { object: Hex } };
  return { abi: artifact.abi, bytecode: artifact.bytecode.object };
}

export async function deployContract(
  client: AnvilClient,
  account: Account,
  file: string,
  contract: string,
  args: unknown[] = [],
) {
  const { abi, bytecode } = await readArtifact(file, contract);
  const hash = await client.deployContract({ abi, bytecode, account, args, chain: client.chain });
  const { contractAddress } = await client.waitForTransactionReceipt({ hash });
  if (!contractAddress) throw new Error(`${contract} was not deployed`);
  return contractAddress;
}

const fundingModes = { fixed: 0, open: 1 } as const;
const day = 86_400;

// Действия с развёрнутым Crowdfunding V2: каждое ждёт блок и возвращает его события,
// разобранные backend-ABI, — так тест заодно проверяет, что ABI совпадает с байткодом.
export function crowdfundingActions(client: AnvilClient, address: Address) {
  const abi = crowdfunding.abi;

  async function send(hash: Hex) {
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`transaction ${hash} reverted`);
    return parseEventLogs({ abi, logs: receipt.logs });
  }

  return {
    address,

    async createCampaign(
      account: Account,
      { goal, mode = "fixed", days = 7, title = "Test campaign", description = "Created by the Anvil stand" }: {
        goal: bigint;
        mode?: keyof typeof fundingModes;
        days?: number;
        title?: string;
        description?: string;
      },
    ) {
      const events = await send(
        await client.writeContract({
          address,
          abi,
          account,
          chain: client.chain,
          functionName: "createCampaign",
          args: [title, description, goal, fundingModes[mode], BigInt(mode === "open" ? 0 : days)],
        }),
      );
      const created = events.find((event) => event.eventName === "CampaignCreated");
      if (!created) throw new Error("CampaignCreated was not emitted");
      return { campaignId: created.args.campaignId, events };
    },

    updateDeadline: async (account: Account, campaignId: bigint, days: number) =>
      send(
        await client.writeContract({
          address,
          abi,
          account,
          chain: client.chain,
          functionName: "updateCampaignDeadline",
          args: [campaignId, BigInt(days)],
        }),
      ),

    donate: async (account: Account, campaignId: bigint, value: bigint) =>
      send(
        await client.writeContract({
          address,
          abi,
          account,
          chain: client.chain,
          functionName: "donate",
          args: [campaignId],
          value,
        }),
      ),

    cancel: async (account: Account, campaignId: bigint) =>
      send(
        await client.writeContract({
          address,
          abi,
          account,
          chain: client.chain,
          functionName: "cancelCampaign",
          args: [campaignId],
        }),
      ),

    refund: async (account: Account, campaignId: bigint) =>
      send(
        await client.writeContract({
          address,
          abi,
          account,
          chain: client.chain,
          functionName: "refund",
          args: [campaignId],
        }),
      ),

    withdraw: async (account: Account, campaignId: bigint) =>
      send(
        await client.writeContract({
          address,
          abi,
          account,
          chain: client.chain,
          functionName: "withdrawFunds",
          args: [campaignId],
        }),
      ),

    // Перемотка времени: следующий блок получает метку на days суток позже.
    async passDays(days: number) {
      await client.increaseTime({ seconds: days * day });
      await client.mine({ blocks: 1 });
    },

    status: (campaignId: bigint) =>
      client.readContract({ address, abi, functionName: "getCampaignStatus", args: [campaignId] }),
  };
}

export type CrowdfundingActions = ReturnType<typeof crowdfundingActions>;

// Свежий Crowdfunding V2 на Anvil: для useAnvil(setup).
export async function deployCrowdfunding(client: AnvilClient, deployer: Account) {
  return crowdfundingActions(client, await deployContract(client, deployer, "Crowdfunding.sol", "Crowdfunding"));
}
