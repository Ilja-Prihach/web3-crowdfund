import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useConfig, useWaitForTransactionReceipt } from "wagmi";
import { simulateContract, writeContract } from "wagmi/actions";

import { crowdfundingContract } from "@/entities/campaign/model/contract";

export type DonateStage = "idle" | "signing" | "confirming" | "confirmed" | "failed";

export function useDonate(campaignId: bigint) {
  const config = useConfig();
  const queryClient = useQueryClient();

  // Сначала бесплатный прогон через eth_call: revert ловится до окна кошелька и до траты газа.
  const send = useMutation({
    mutationFn: async (value: bigint) => {
      const { request } = await simulateContract(config, {
        ...crowdfundingContract,
        functionName: "donate",
        args: [campaignId],
        value,
      });
      return writeContract(config, request);
    },
  });

  const receipt = useWaitForTransactionReceipt({ chainId: crowdfundingContract.chainId, hash: send.data });

  // Все чтения wagmi лежат под ключом "readContract": помечаем их устаревшими, и экран перечитает контракт.
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["readContract"] });

  // После подтверждения перечитываем контракт: сумма, статус и вклад изменились.
  useEffect(() => {
    if (receipt.isSuccess) void queryClient.invalidateQueries({ queryKey: ["readContract"] });
  }, [receipt.isSuccess, queryClient]);

  const stage: DonateStage = send.isPending
    ? "signing"
    : send.isError || receipt.isError
      ? "failed"
      : receipt.isSuccess
        ? "confirmed"
        : send.data
          ? "confirming"
          : "idle";

  return {
    stage,
    hash: send.data,
    error: send.error ?? receipt.error,
    donate: (value: bigint) => send.mutate(value),
    reset: () => send.reset(),
    refresh,
  };
}
