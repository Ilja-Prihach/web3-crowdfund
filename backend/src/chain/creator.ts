import type { Address } from "viem";

import type { ChainClient } from "./client.ts";
import { crowdfunding } from "./contract.ts";

export type CampaignEditState = { creator: Address; totalRaised: bigint };

// Создатель и факт первого пожертвования по контракту на последнем блоке; null — кампании с таким ID нет.
// Проекция indexer для этого не годится: она отстаёт до finalized-блока, а право записи решает контракт.
// getCampaigns, а не автогеттер campaigns(id): для несуществующего ID он вернул бы нулевой адрес, а не пустой ответ.
export async function readCampaignEditState(
  chain: ChainClient,
  contract: Address,
  campaignId: bigint,
): Promise<CampaignEditState | null> {
  const [view] = await chain.readContract({
    address: contract,
    abi: crowdfunding.abi,
    functionName: "getCampaigns",
    args: [campaignId, 1n],
  });
  return view ? { creator: view.campaign.creator, totalRaised: view.campaign.totalRaised } : null;
}
