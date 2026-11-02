import { useConfig } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";

import { crowdfundingContract } from "@/entities/campaign/model/contract";
import type { ContractErrorMessages } from "@/features/transaction-status/lib/transactionErrors";
import { useContractTransaction } from "@/features/transaction-status/model/useContractTransaction";

const updateDeadlineErrorMessages: ContractErrorMessages = {
  CampaignHasEnded: "Срок уже истёк — продлить закончившуюся кампанию нельзя.",
  CampaignIsCancelled: "Кампания отменена — её срок больше не меняется.",
};

export function useUpdateDeadline(campaignId: bigint) {
  const config = useConfig();
  // Новый срок контракт считает от момента блока, а не от старого дедлайна: block.timestamp + days.
  const transaction = useContractTransaction(async (days: bigint) => {
    const { request } = await simulateContract(config, {
      ...crowdfundingContract,
      functionName: "updateCampaignDeadline",
      args: [campaignId, days],
    });
    return writeContract(config, request);
  });

  return { ...transaction, updateDeadline: transaction.start, errorMessages: updateDeadlineErrorMessages };
}
