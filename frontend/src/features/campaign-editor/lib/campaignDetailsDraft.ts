import { formatEther } from "viem";

import type { CampaignDetails, CampaignDetailsUpdate } from "../../../entities/campaign/api/detailsApi.ts";
import type { CampaignCategory } from "../../../entities/campaign/model/campaign.ts";
import { parseEthAmount } from "../../../shared/lib/ethAmount.ts";

export const campaignDetailsLimits = { story: 10_000, risks: 2_000, budgetRows: 12, planSteps: 12 } as const;
export const maxCoverBytes = 5 * 1024 * 1024;
export const coverTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export type CampaignDetailsDraft = {
  category: CampaignCategory | "";
  story: string;
  budget: { label: string; amount: string }[];
  plan: { period: string; task: string }[];
  risks: string;
};

export type CampaignDetailsDraftErrors = Partial<Record<"story" | "budget" | "plan" | "risks", string>>;
export type ValidatedCampaignDetails =
  | { ok: true; input: CampaignDetailsUpdate; budgetTotal: bigint }
  | { ok: false; errors: CampaignDetailsDraftErrors };

export function campaignDetailsToDraft(details: CampaignDetails): CampaignDetailsDraft {
  return {
    category: details.category ?? "",
    story: details.story ?? "",
    budget: details.budget?.map((row) => ({ label: row.label, amount: formatEther(row.amount) })) ?? [],
    plan: details.plan?.map((step) => ({ ...step })) ?? [],
    risks: details.risks ?? "",
  };
}

const optionalText = (value: string) => value.trim() || null;

export function validateCampaignDetailsDraft(draft: CampaignDetailsDraft): ValidatedCampaignDetails {
  const errors: CampaignDetailsDraftErrors = {};
  const story = optionalText(draft.story);
  const risks = optionalText(draft.risks);

  if (draft.story.length > campaignDetailsLimits.story) errors.story = `Не больше ${campaignDetailsLimits.story} символов`;
  if (draft.risks.length > campaignDetailsLimits.risks) errors.risks = `Не больше ${campaignDetailsLimits.risks} символов`;
  if (draft.budget.length > campaignDetailsLimits.budgetRows) {
    errors.budget = `Не больше ${campaignDetailsLimits.budgetRows} строк`;
  }
  if (draft.plan.length > campaignDetailsLimits.planSteps) errors.plan = `Не больше ${campaignDetailsLimits.planSteps} этапов`;

  const budget: NonNullable<CampaignDetailsUpdate["budget"]> = [];
  for (const row of draft.budget) {
    const label = row.label.trim();
    const amount = parseEthAmount(row.amount);
    if (!label) {
      errors.budget = "Заполните назначение каждой суммы";
      break;
    }
    if (!amount.ok) {
      errors.budget = amount.error;
      break;
    }
    if (label.length > 120) {
      errors.budget = "Название расхода — не больше 120 символов";
      break;
    }
    budget.push({ label, amount: amount.wei });
  }

  const plan: NonNullable<CampaignDetailsUpdate["plan"]> = [];
  for (const step of draft.plan) {
    const period = step.period.trim();
    const task = step.task.trim();
    if (!period || !task) {
      errors.plan = "Заполните период и задачу каждого этапа";
      break;
    }
    if (period.length > 60 || task.length > 300) {
      errors.plan = "Период — до 60 символов, задача — до 300";
      break;
    }
    plan.push({ period, task });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const budgetTotal = budget.reduce((sum, row) => sum + row.amount, 0n);
  return {
    ok: true,
    budgetTotal,
    input: {
      category: draft.category || null,
      story,
      budget: budget.length > 0 ? budget : null,
      plan: plan.length > 0 ? plan : null,
      risks,
    },
  };
}

export function validateCoverFile(file: Pick<File, "size" | "type">): string | null {
  if (!coverTypes.includes(file.type as (typeof coverTypes)[number])) return "Выберите JPEG, PNG или WebP";
  if (file.size > maxCoverBytes) return "Файл должен быть не больше 5 МБ";
  if (file.size === 0) return "Файл пустой";
  return null;
}
