import { BackendApiError, parseUint, requestBackend } from "../../../shared/api/backend.ts";
import { fromCampaignJson } from "./catalogApi.ts";

type CampaignJson = Parameters<typeof fromCampaignJson>[0];

function parseCount(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new BackendApiError(200, "INVALID_RESPONSE");
  }
  return value;
}

export async function fetchHomeOverview(signal?: AbortSignal) {
  const { overview } = await requestBackend("/campaigns/overview", { signal }) as {
    overview?: {
      launched: unknown;
      reachedGoal: unknown;
      donors: unknown;
      donatedWei: unknown;
      finalizedBlock: unknown;
      items: CampaignJson[];
    } | null;
  };
  if (overview === null) return null;
  if (!overview || !Array.isArray(overview.items) || overview.items.length > 3) {
    throw new BackendApiError(200, "INVALID_RESPONSE");
  }

  return {
    launched: parseCount(overview.launched),
    reachedGoal: parseCount(overview.reachedGoal),
    donors: parseCount(overview.donors),
    donatedWei: parseUint(overview.donatedWei, "donatedWei"),
    finalizedBlock: parseUint(overview.finalizedBlock, "finalizedBlock"),
    campaigns: overview.items.map(fromCampaignJson),
  };
}
