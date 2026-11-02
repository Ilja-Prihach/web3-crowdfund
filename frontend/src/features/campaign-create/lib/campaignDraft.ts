import { parseDurationDays } from "../../../entities/campaign/lib/duration.ts";
import { parseEthAmount } from "../../../shared/lib/ethAmount.ts";
import { utf8ByteLength } from "../../../shared/lib/utf8.ts";

// Совпадают с константами Crowdfunding.sol.
export const maxTitleBytes = 100;
export const maxDescriptionBytes = 1000;

export type CampaignDraft = {
  title: string;
  description: string;
  goal: string;
  fundingMode: "fixedDeadline" | "openEnded";
  durationDays: string;
};

export type CampaignDraftErrors = Partial<Record<"title" | "description" | "goal" | "durationDays", string>>;

export type ValidatedDraft =
  | { ok: true; args: readonly [string, string, bigint, 0 | 1, bigint] }
  | { ok: false; errors: CampaignDraftErrors };

// Те же правила, что у createCampaign, но до подписи и с понятным текстом под каждым полем.
export function validateCampaignDraft(draft: CampaignDraft): ValidatedDraft {
  const errors: CampaignDraftErrors = {};
  const title = draft.title.trim();
  const description = draft.description.trim();

  if (title === "") errors.title = "Введите название";
  else if (utf8ByteLength(title) > maxTitleBytes) errors.title = `Не больше ${maxTitleBytes} байт`;

  if (description === "") errors.description = "Опишите проект";
  else if (utf8ByteLength(description) > maxDescriptionBytes) {
    errors.description = `Не больше ${maxDescriptionBytes} байт`;
  }

  const goal = parseEthAmount(draft.goal);
  if (!goal.ok) errors.goal = goal.error;

  let duration = 0n;
  if (draft.fundingMode === "fixedDeadline") {
    const parsed = parseDurationDays(draft.durationDays);
    if (parsed.ok) duration = parsed.days;
    else errors.durationDays = parsed.error;
  }

  if (Object.keys(errors).length > 0 || !goal.ok) return { ok: false, errors };

  const mode = draft.fundingMode === "fixedDeadline" ? 0 : 1;
  return { ok: true, args: [title, description, goal.wei, mode, duration] };
}
