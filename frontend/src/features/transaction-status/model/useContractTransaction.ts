import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Hash } from "viem";
import { useWaitForTransactionReceipt } from "wagmi";

import { crowdfundingContract } from "@/entities/campaign/model/contract";

import type { TransactionStage } from "../ui/TransactionStatus/TransactionStatus";

// Общий путь любой записи в контракт: отправка → ожидание блока → обновление чтений.
export function useContractTransaction<Variables>(send: (variables: Variables) => Promise<Hash>) {
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: send });
  const receipt = useWaitForTransactionReceipt({ chainId: crowdfundingContract.chainId, hash: mutation.data });

  // Все чтения wagmi лежат под ключом "readContract": помечаем их устаревшими, и экран перечитает контракт.
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["readContract"] });

  // После подтверждения перечитываем контракт: суммы, статусы и вклады изменились.
  useEffect(() => {
    if (receipt.isSuccess) void queryClient.invalidateQueries({ queryKey: ["readContract"] });
  }, [receipt.isSuccess, queryClient]);

  const stage: TransactionStage | "idle" = mutation.isPending
    ? "signing"
    : mutation.isError || receipt.isError
      ? "failed"
      : receipt.isSuccess
        ? "confirmed"
        : mutation.data
          ? "confirming"
          : "idle";

  return {
    stage,
    hash: mutation.data,
    receipt: receipt.data,
    error: mutation.error ?? receipt.error,
    start: (variables: Variables) => mutation.mutate(variables),
    reset: () => mutation.reset(),
    refresh,
  };
}
