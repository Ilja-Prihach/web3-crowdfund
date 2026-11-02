import { useConfig } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";

import { crowdfundingContract } from "@/entities/campaign/model/contract";
import type { ContractErrorMessages } from "@/features/transaction-status/lib/transactionErrors";
import { useContractTransaction } from "@/features/transaction-status/model/useContractTransaction";

// Как те же ошибки контракта звучат именно для вклада.
const donateErrorMessages: ContractErrorMessages = {
  GoalWasReached: "Цель уже достигнута — контракт больше не принимает вклады в эту кампанию.",
  CampaignHasEnded: "Срок кампании истёк — вклады больше не принимаются.",
  CampaignIsCancelled: "Создатель отменил кампанию — вклады не принимаются.",
  DonationMustBeGreaterThanZero: "Сумма вклада должна быть больше нуля.",
};

export function useDonate(campaignId: bigint) {
  const config = useConfig();
  const transaction = useContractTransaction(async (value: bigint) => {
    // Сначала бесплатный прогон через eth_call: revert ловится до окна кошелька и до траты газа.
    const { request } = await simulateContract(config, {
      ...crowdfundingContract,
      functionName: "donate",
      args: [campaignId],
      value,
    });
    return writeContract(config, request);
  });

  return { ...transaction, donate: transaction.start, errorMessages: donateErrorMessages };
}
