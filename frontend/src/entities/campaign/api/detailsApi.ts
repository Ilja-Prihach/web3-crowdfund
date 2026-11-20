import { BackendApiError, type BackendRequestOptions, parseUint, requestBackend } from "../../../shared/api/backend.ts";
import { type CampaignCategory, campaignCategories } from "../model/campaign.ts";

// Детали кампании от создателя (#49): обложка, категория, история, бюджет, план и риски.
// Это off-chain-тексты backend, а не данные сбора: суммы и правила страница читает из контракта.

export type BudgetRow = { label: string; amount: bigint };
export type PlanStep = { period: string; task: string };

export type CampaignDetails = {
  category: CampaignCategory | null;
  story: string | null;
  budget: BudgetRow[] | null;
  plan: PlanStep[] | null;
  risks: string | null;
  // Адрес картинки своего источника: /api/v1/media/covers/<sha256>.webp.
  coverUrl: string | null;
  // Последняя правка создателем; null — ничего не заполнено.
  updatedAt: Date | null;
};

type DetailsJson = {
  category: string | null;
  story: string | null;
  budget: { label: string; amount: string }[] | null;
  plan: { period: string; task: string }[] | null;
  risks: string | null;
  coverUrl: string | null;
  updatedAt: string | null;
};

const invalid = (cause: string) => new BackendApiError(200, "INVALID_RESPONSE", { cause });

export function parseCategory(value: unknown): CampaignCategory | null {
  if (value === null || value === undefined) return null;
  const category = campaignCategories.find((known) => known === value);
  if (!category) throw invalid(`category ${String(value)}`);
  return category;
}

// Принимается только путь к файлу обложки нашего backend. Ответ с чужим адресом (трекер, javascript:, data:)
// — ошибка ответа, а не картинка: в <img src> уходит только то, что мы ожидаем.
const coverPathPattern = /^\/v1\/media\/covers\/[0-9a-f]{64}\.webp$/;

export function parseCoverUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string" || !coverPathPattern.test(value)) throw invalid(`coverUrl ${String(value)}`);
  // Backend отдаёт путь от корня API, браузер ходит в него через /api своего источника.
  return `/api${value}`;
}

const optionalText = (value: unknown, field: string) => {
  if (value === null) return null;
  if (typeof value !== "string") throw invalid(`${field} ${String(value)}`);
  return value;
};

function parseList<T>(value: unknown, field: string, parseItem: (item: Record<string, unknown>) => T): T[] | null {
  if (value === null) return null;
  if (!Array.isArray(value)) throw invalid(`${field} is not a list`);
  return value.map((item: unknown) => {
    if (item === null || typeof item !== "object") throw invalid(`${field} item`);
    return parseItem(item as Record<string, unknown>);
  });
}

export function fromDetailsJson(json: DetailsJson): CampaignDetails {
  const updatedAt = json.updatedAt === null ? null : new Date(json.updatedAt);
  if (updatedAt && Number.isNaN(updatedAt.getTime())) throw invalid(`updatedAt ${json.updatedAt}`);

  return {
    category: parseCategory(json.category),
    story: optionalText(json.story, "story"),
    budget: parseList(json.budget, "budget", (row) => ({
      label: optionalText(row.label, "budget label") ?? "",
      amount: parseUint(row.amount, "budget amount"),
    })),
    plan: parseList(json.plan, "plan", (step) => ({
      period: optionalText(step.period, "plan period") ?? "",
      task: optionalText(step.task, "plan task") ?? "",
    })),
    risks: optionalText(json.risks, "risks"),
    coverUrl: parseCoverUrl(json.coverUrl),
    updatedAt,
  };
}

export async function fetchCampaignDetails(campaignId: bigint, options?: BackendRequestOptions) {
  const body = (await requestBackend(`/campaigns/${campaignId}/details`, options)) as DetailsJson;
  return fromDetailsJson(body);
}

// Есть ли что показать в разделах страницы: обложка и категория живут в шапке, а не в разделах.
export const hasDetailsSections = ({ story, budget, plan, risks }: CampaignDetails) =>
  story !== null || budget !== null || plan !== null || risks !== null;
