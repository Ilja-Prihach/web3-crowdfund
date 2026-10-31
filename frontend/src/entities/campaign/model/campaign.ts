// Порядок совпадает с enum в Crowdfunding.sol: контракт возвращает индекс значения.
export const campaignStatuses = ["active", "successful", "failed", "withdrawn", "cancelled"] as const;
export const fundingModes = ["fixedDeadline", "openEnded"] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];
export type FundingMode = (typeof fundingModes)[number];

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  active: "Активна",
  successful: "Цель достигнута",
  failed: "Провал",
  withdrawn: "Средства выведены",
  cancelled: "Отменена",
};

export const fundingModeLabels: Record<FundingMode, string> = {
  fixedDeadline: "Есть срок",
  openEnded: "Без срока",
};

export function toCampaignStatus(value: number): CampaignStatus {
  const status = campaignStatuses[value];
  if (!status) throw new Error(`Unknown campaign status: ${value}`);
  return status;
}

export function toFundingMode(value: number): FundingMode {
  const mode = fundingModes[value];
  if (!mode) throw new Error(`Unknown funding mode: ${value}`);
  return mode;
}
