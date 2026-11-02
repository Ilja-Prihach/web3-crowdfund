import { useConfig } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";

import { crowdfundingContract } from "@/entities/campaign/model/contract";
import { useContractTransaction } from "@/features/transaction-status/model/useContractTransaction";

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

  return { ...transaction, donate: transaction.start };
}
