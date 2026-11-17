import { type Address, getAddress, type Hash, isAddress } from "viem";

import {
  BackendApiError,
  type BackendRequestOptions,
  parseFinalizedBlock,
  parseUint,
  requestBackend,
} from "../../../shared/api/backend.ts";

// История кампании из indexer: лента событий и донатеры. Это дополнение к странице, а не финансовая истина:
// суммы сбора и действия страница читает из контракта.

export const activityTypes = ["created", "deadline_updated", "donation", "refund", "cancelled", "withdrawn"] as const;
export type ActivityType = (typeof activityTypes)[number];

export type ActivityItem = {
  type: ActivityType;
  // Донатер у вклада и возврата, создатель у остальных событий.
  actor: Address | null;
  // Сумма в wei у вклада, возврата и вывода.
  amount: bigint | null;
  // Срок у создания и смены срока; null у сбора без срока.
  deadline: bigint | null;
  blockNumber: bigint;
  // null — событие записано до того, как indexer начал хранить время блока.
  blockTimestamp: Date | null;
  txHash: Hash;
  logIndex: number;
};

export type Donor = {
  donor: Address;
  // Текущий вклад, как contributions() контракта.
  amount: bigint;
  donated: bigint;
  refunded: bigint;
  donations: number;
};

// Ответ backend: uint256 — десятичные строки, время — ISO 8601.
type ActivityItemJson = {
  type: string;
  actor: string | null;
  amount: string | null;
  deadline: string | null;
  blockNumber: string;
  blockTimestamp: string | null;
  txHash: string;
  logIndex: number;
};
type DonorJson = { donor: string; amount: string; donated: string; refunded: string; donations: number };
type ActivityPageJson = { items: ActivityItemJson[]; nextCursor: string | null; finalizedBlock: string | null };
type DonorsPageJson = { items: DonorJson[]; total: number; finalizedBlock: string | null };

const invalid = (cause: string) => new BackendApiError(200, "INVALID_RESPONSE", { cause });

// Backend хранит адреса строчными; интерфейс показывает их с контрольной суммой EIP-55, как из контракта.
function parseAddress(value: unknown, field: string) {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) throw invalid(`${field} ${String(value)}`);
  return getAddress(value);
}

const parseOptionalUint = (value: unknown, field: string) => (value === null ? null : parseUint(value, field));

export function fromActivityJson(json: ActivityItemJson): ActivityItem {
  const type = activityTypes.find((known) => known === json.type);
  if (!type) throw invalid(`activity type ${json.type}`);
  if (!/^0x[0-9a-fA-F]{64}$/.test(json.txHash)) throw invalid(`txHash ${json.txHash}`);
  const blockTimestamp = json.blockTimestamp === null ? null : new Date(json.blockTimestamp);
  if (blockTimestamp && Number.isNaN(blockTimestamp.getTime())) throw invalid(`blockTimestamp ${json.blockTimestamp}`);

  return {
    type,
    actor: json.actor === null ? null : parseAddress(json.actor, "actor"),
    amount: parseOptionalUint(json.amount, "amount"),
    deadline: parseOptionalUint(json.deadline, "deadline"),
    blockNumber: parseUint(json.blockNumber, "blockNumber"),
    blockTimestamp,
    txHash: json.txHash as Hash,
    logIndex: json.logIndex,
  };
}

export function fromDonorJson(json: DonorJson): Donor {
  return {
    donor: parseAddress(json.donor, "donor"),
    amount: parseUint(json.amount, "amount"),
    donated: parseUint(json.donated, "donated"),
    refunded: parseUint(json.refunded, "refunded"),
    donations: json.donations,
  };
}

// Страница ленты от новых событий к старым. before — nextCursor прошлой страницы; клиент его не разбирает.
export async function fetchActivity(
  campaignId: bigint,
  { limit, before }: { limit: number; before?: string },
  options?: BackendRequestOptions,
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before !== undefined) params.set("before", before);
  const body = (await requestBackend(`/campaigns/${campaignId}/activity?${params.toString()}`, options)) as ActivityPageJson;
  if (!Array.isArray(body.items)) throw invalid("activity items");

  return {
    items: body.items.map(fromActivityJson),
    nextCursor: body.nextCursor,
    finalizedBlock: parseFinalizedBlock(body.finalizedBlock),
  };
}

// Текущие донатеры по убыванию вклада; total — число участников кампании.
export async function fetchDonors(
  campaignId: bigint,
  { limit, offset }: { limit: number; offset: number },
  options?: BackendRequestOptions,
) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const body = (await requestBackend(`/campaigns/${campaignId}/donors?${params.toString()}`, options)) as DonorsPageJson;
  if (!Array.isArray(body.items)) throw invalid("donor items");

  return {
    items: body.items.map(fromDonorJson),
    total: body.total,
    finalizedBlock: parseFinalizedBlock(body.finalizedBlock),
  };
}
