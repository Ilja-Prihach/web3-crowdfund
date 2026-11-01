import { useConnection, useReadContract } from "wagmi";

import { toCampaign } from "./campaign";
import { crowdfundingContract } from "./contract";

export function useCampaign(id: bigint) {
  const { address } = useConnection();

  // Страница из одной кампании: статус уже посчитан контрактом, пустой ответ — кампании нет.
  const campaign = useReadContract({
    ...crowdfundingContract,
    functionName: "getCampaigns",
    args: [id, 1n],
    query: { select: (views) => (views[0] ? toCampaign(views[0]) : null) },
  });

  const contribution = useReadContract({
    ...crowdfundingContract,
    functionName: "contributions",
    args: address ? [id, address] : undefined,
    query: { enabled: Boolean(address) && Boolean(campaign.data) },
  });

  return {
    // undefined — ещё грузится, null — такой кампании нет.
    campaign: campaign.data,
    contribution: contribution.data,
    account: address,
    isPending: campaign.isPending,
    isError: campaign.isError,
    retry: () => campaign.refetch(),
  };
}
