// Совпадает с MAX_DURATION_DAYS в Crowdfunding.sol: так проверяют и createCampaign, и updateCampaignDeadline.
export const maxDurationDays = 365;

export type ParsedDuration = { ok: true; days: bigint } | { ok: false; error: string };

// Строго цифры: "1.5", "1e2" и пустая строка не проходят, хотя Number() принял бы часть из них.
export function parseDurationDays(input: string): ParsedDuration {
  const value = input.trim();
  const days = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(days) || days < 1 || days > maxDurationDays) {
    return { ok: false, error: `Срок — целое число дней от 1 до ${maxDurationDays}` };
  }
  return { ok: true, days: BigInt(days) };
}
