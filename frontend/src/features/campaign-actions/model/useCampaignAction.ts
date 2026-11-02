import { useConfig } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";

import { crowdfundingContract } from "@/entities/campaign/model/contract";
import type { ContractErrorMessages } from "@/features/transaction-status/lib/transactionErrors";
import { useContractTransaction } from "@/features/transaction-status/model/useContractTransaction";

type CampaignActionFunction = "refund" | "cancelCampaign" | "withdrawFunds";

// Ошибки, которые для этих действий звучат иначе, чем в общем словаре.
const errorMessages: Record<CampaignActionFunction, ContractErrorMessages> = {
  refund: {
    GoalWasReached: "Цель достигнута — вклады больше не возвращаются, средства получит создатель.",
  },
  cancelCampaign: {
    GoalWasReached: "Цель уже достигнута — успешный сбор отменить нельзя.",
    CampaignHasEnded: "Срок кампании истёк — отменять уже поздно, участники и так могут вернуть вклады.",
  },
  withdrawFunds: {
    CampaignIsCancelled: "Кампания отменена — средства возвращаются участникам, вывести их нельзя.",
  },
};

export function useCampaignAction(campaignId: bigint, functionName: CampaignActionFunction) {
  const config = useConfig();
  // <void>: у действия нет параметров, всё нужное — ID кампании и адрес из кошелька (msg.sender).
  const transaction = useContractTransaction<void>(async () => {
    const { request } = await simulateContract(config, {
      ...crowdfundingContract,
      functionName,
      args: [campaignId],
    });
    return writeContract(config, request);
  });

  return { ...transaction, errorMessages: errorMessages[functionName] };
}
