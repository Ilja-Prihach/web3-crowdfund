import { useReadContract } from "wagmi";

import { type CatalogOrder, getPageCount, getPageWindow } from "../lib/pagination";
import { toCampaign } from "./campaign";
import { crowdfundingContract } from "./contract";

// enabled: false — контракт не читается, пока каталог отдаёт backend: RPC-запросы не тратятся зря.
export function useCampaignCatalog(page: number, order: CatalogOrder, enabled = true) {
  const total = useReadContract({ ...crowdfundingContract, functionName: "nextCampaignId", query: { enabled } });
  const pageWindow = total.data === undefined ? null : getPageWindow(total.data, page, order);

  const campaigns = useReadContract({
    ...crowdfundingContract,
    functionName: "getCampaigns",
    args: pageWindow ? [pageWindow.offset, pageWindow.limit] : undefined,
    query: {
      enabled: enabled && pageWindow !== null,
      select: (views) => {
        const list = views.map(toCampaign);
        return order === "newest" ? list.reverse() : list;
      },
    },
  });

  return {
    campaigns: pageWindow ? (campaigns.data ?? []) : [],
    total: total.data,
    pageCount: total.data === undefined ? 0 : getPageCount(total.data),
    isPending: total.isPending || (pageWindow !== null && campaigns.isPending),
    isError: total.isError || campaigns.isError,
    retry: () => (total.isError ? total.refetch() : campaigns.refetch()),
  };
}
