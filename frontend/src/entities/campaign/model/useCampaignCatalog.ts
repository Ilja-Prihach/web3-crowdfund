import { useReadContract } from "wagmi";

import { crowdfundingAbi } from "@/shared/config/crowdfundingAbi";
import { crowdfundingAddress, supportedChain } from "@/shared/config/web3";

import { type CatalogOrder, getPageCount, getPageWindow } from "../lib/pagination";
import { toCampaign } from "./campaign";

// Каталог всегда читает Sepolia через наш RPC, независимо от сети и наличия кошелька.
const contract = {
  address: crowdfundingAddress,
  abi: crowdfundingAbi,
  chainId: supportedChain.id,
} as const;

export function useCampaignCatalog(page: number, order: CatalogOrder) {
  const total = useReadContract({ ...contract, functionName: "nextCampaignId" });
  const pageWindow = total.data === undefined ? null : getPageWindow(total.data, page, order);

  const campaigns = useReadContract({
    ...contract,
    functionName: "getCampaigns",
    args: pageWindow ? [pageWindow.offset, pageWindow.limit] : undefined,
    query: {
      enabled: pageWindow !== null,
      select: (views) => {
        const list = views.map(toCampaign);
        return order === "newest" ? list.reverse() : list;
      },
    },
  });

  return {
    campaigns: pageWindow ? (campaigns.data ?? []) : [],
    pageCount: total.data === undefined ? 0 : getPageCount(total.data),
    isPending: total.isPending || (pageWindow !== null && campaigns.isPending),
    isError: total.isError || campaigns.isError,
    retry: () => (total.isError ? total.refetch() : campaigns.refetch()),
  };
}
