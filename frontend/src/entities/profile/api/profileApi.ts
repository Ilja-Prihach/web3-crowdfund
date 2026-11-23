import { getAddress, isAddress, type Address } from "viem";

import { fromCampaignJson } from "../../campaign/api/catalogApi.ts";
import { BackendApiError, parseFinalizedBlock, requestBackend } from "../../../shared/api/backend.ts";

export type Profile = { address: Address; name: string | null; bio: string | null; createdAt: Date; updatedAt: Date };
export type ProfileInput = { name: string | null; bio: string | null };
export type ProfileCampaignKind = "created" | "supported";

export function parseProfileAddress(value: string): Address | null {
  return isAddress(value, { strict: false }) ? getAddress(value.toLowerCase()) : null;
}

const invalid = () => new BackendApiError(200, "INVALID_RESPONSE");
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
  return value as Record<string, unknown>;
};
const nullableText = (value: unknown) => {
  if (value !== null && typeof value !== "string") throw invalid();
  return value;
};
const date = (value: unknown) => {
  if (typeof value !== "string") throw invalid();
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) throw invalid();
  return result;
};

export function fromProfileJson(value: unknown): Profile {
  const body = record(value);
  const address = typeof body.address === "string" ? parseProfileAddress(body.address) : null;
  if (!address) throw invalid();
  return { address, name: nullableText(body.name), bio: nullableText(body.bio), createdAt: date(body.createdAt), updatedAt: date(body.updatedAt) };
}

export async function fetchProfile(address: Address, signal?: AbortSignal) {
  try {
    const result = fromProfileJson(await requestBackend(`/profiles/${address}`, { signal }));
    if (result.address !== getAddress(address)) throw invalid();
    return result;
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 404 && error.code === "PROFILE_NOT_FOUND") return null;
    throw error;
  }
}

export async function saveProfile(address: Address, input: ProfileInput) {
  return fromProfileJson(await requestBackend("/profiles/me", { init: {
    method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, expectedAddress: address }),
  } }));
}

export async function fetchProfileCampaigns(address: Address, kind: ProfileCampaignKind, page: number, signal?: AbortSignal) {
  const body = record(await requestBackend(`/profiles/${address}/campaigns/${kind}?limit=6&offset=${page * 6}`, { signal }));
  if (!Array.isArray(body.items) || typeof body.total !== "number" || !Number.isSafeInteger(body.total) || body.total < 0) throw invalid();
  return {
    campaigns: body.items.map((item: Parameters<typeof fromCampaignJson>[0]) => fromCampaignJson(item)),
    total: body.total,
    finalizedBlock: parseFinalizedBlock(body.finalizedBlock),
  };
}
