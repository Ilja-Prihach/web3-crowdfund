"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type CampaignDetailsUpdate, saveCampaignDetails } from "@/entities/campaign/api/detailsApi";
import { campaignDetailsQueryKey } from "@/entities/campaign/model/useCampaignDetails";

export function useSaveCampaignDetails(campaignId: bigint) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CampaignDetailsUpdate) => saveCampaignDetails(campaignId, input),
    onSuccess: (details) => {
      queryClient.setQueryData(campaignDetailsQueryKey(campaignId), details);
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}
