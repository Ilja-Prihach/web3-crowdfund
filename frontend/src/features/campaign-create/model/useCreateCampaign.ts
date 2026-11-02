import { parseEventLogs } from "viem";
import { useConfig } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";

import { crowdfundingContract } from "@/entities/campaign/model/contract";
import { useContractTransaction } from "@/features/transaction-status/model/useContractTransaction";

import type { ValidatedDraft } from "../lib/campaignDraft";

type CreateArgs = Extract<ValidatedDraft, { ok: true }>["args"];

export function useCreateCampaign() {
  const config = useConfig();
  const transaction = useContractTransaction(async (args: CreateArgs) => {
    const { request } = await simulateContract(config, {
      ...crowdfundingContract,
      functionName: "createCampaign",
      args,
    });
    return writeContract(config, request);
  });

  // ID берём из события нашей же транзакции, а не из nextCampaignId: так не перепутать с чужой кампанией.
  const [created] = transaction.receipt
    ? parseEventLogs({ abi: crowdfundingContract.abi, eventName: "CampaignCreated", logs: transaction.receipt.logs })
    : [];

  return { ...transaction, createdId: created?.args.campaignId };
}
