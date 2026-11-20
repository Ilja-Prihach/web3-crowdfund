import type { ContractFunctionReturnType } from "viem";

import type { crowdfundingAbi } from "@/shared/config/crowdfundingAbi";

// Порядок совпадает с enum в Crowdfunding.sol: контракт возвращает индекс значения.
export const campaignStatuses = ["active", "successful", "failed", "withdrawn", "cancelled"] as const;
export const fundingModes = ["fixedDeadline", "openEnded"] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];
export type FundingMode = (typeof fundingModes)[number];

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  active: "Активна",
  successful: "Цель достигнута",
  failed: "Срок истёк",
  withdrawn: "Средства выведены",
  cancelled: "Отменена",
};

export const fundingModeLabels: Record<FundingMode, string> = {
  fixedDeadline: "Сбор к сроку",
  openEnded: "Открытая цель",
};

// Категории из backend (#49): в контракте их нет, выбирает создатель. Порядок — порядок фильтра каталога.
export const campaignCategories = ["open_source", "education", "creative", "apps", "community"] as const;
export type CampaignCategory = (typeof campaignCategories)[number];

export const campaignCategoryLabels: Record<CampaignCategory, string> = {
  open_source: "Open source",
  education: "Образование",
  creative: "Творчество и игры",
  apps: "Приложения",
  community: "Сообщества",
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

// Тип одного элемента ответа getCampaigns, выведенный из ABI.
type CampaignView = ContractFunctionReturnType<typeof crowdfundingAbi, "view", "getCampaigns">[number];

export function toCampaign({ id, campaign, status }: CampaignView) {
  return {
    id,
    creator: campaign.creator,
    title: campaign.title,
    description: campaign.description,
    goal: campaign.goal,
    deadline: campaign.deadline,
    totalRaised: campaign.totalRaised,
    fundingMode: toFundingMode(campaign.fundingMode),
    status: toCampaignStatus(status),
  };
}

// Поля, которые знает только backend; при чтении контракта их нет.
// donors — число участников, category и coverUrl — из деталей создателя (null — не заполнено).
export type Campaign = ReturnType<typeof toCampaign> & {
  donors?: number;
  category?: CampaignCategory | null;
  coverUrl?: string | null;
};
