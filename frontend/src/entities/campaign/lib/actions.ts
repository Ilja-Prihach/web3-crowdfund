import { isAddressEqual, type Address } from "viem";

import type { Campaign } from "../model/campaign";

export type CampaignAction = "donate" | "withdraw" | "cancel" | "updateDeadline" | "refund";

// Подсказка интерфейсу по revert-условиям Crowdfunding.sol. Окончательно решает контракт.
export function getAvailableActions(
  campaign: Campaign,
  account: Address | undefined,
  contribution: bigint,
): CampaignAction[] {
  const isCreator = account !== undefined && isAddressEqual(account, campaign.creator);
  const isActive = campaign.status === "active";
  const isOpenEnded = campaign.fundingMode === "openEnded";
  const actions: CampaignAction[] = [];

  if (isActive) actions.push("donate");
  if (isCreator && campaign.status === "successful") actions.push("withdraw");
  if (isCreator && isActive) actions.push("cancel");
  if (isCreator && isActive && !isOpenEnded && campaign.totalRaised === 0n) actions.push("updateDeadline");

  const canRefund =
    campaign.status === "failed" || campaign.status === "cancelled" || (isActive && isOpenEnded);
  if (contribution > 0n && canRefund) actions.push("refund");

  return actions;
}
