"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";

import { fetchProfile, fetchProfileCampaigns, type ProfileCampaignKind } from "../api/profileApi";

export const profileQueryKey = (address: Address) => ["profile", address.toLowerCase()] as const;
export function useProfile(address: Address) {
  return useQuery({ queryKey: profileQueryKey(address), queryFn: ({ signal }) => fetchProfile(address, signal), retry: false });
}
export function useProfileCampaigns(address: Address, kind: ProfileCampaignKind, page: number) {
  return useQuery({
    queryKey: ["profile-campaigns", address.toLowerCase(), kind, page],
    queryFn: ({ signal }) => fetchProfileCampaigns(address, kind, page, signal), retry: false,
  });
}
