"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  deleteCampaignCover,
  type CampaignDetailsUpdate,
  saveCampaignDetails,
  uploadCampaignCover,
} from "@/entities/campaign/api/detailsApi";
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

function useCoverMutation(campaignId: bigint, mutationFn: (file: File) => ReturnType<typeof uploadCampaignCover>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (details) => {
      queryClient.setQueryData(campaignDetailsQueryKey(campaignId), details);
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}

export function useUploadCampaignCover(campaignId: bigint) {
  return useCoverMutation(campaignId, (file) => uploadCampaignCover(campaignId, file));
}

export function useDeleteCampaignCover(campaignId: bigint) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCampaignCover(campaignId),
    onSuccess: (details) => {
      queryClient.setQueryData(campaignDetailsQueryKey(campaignId), details);
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
    },
  });
}
