import type { ContractErrorName } from "viem";

import type { crowdfundingAbi } from "../../../shared/config/crowdfundingAbi.ts";
import { findInCauseChain, getWalletErrorMessage } from "../../wallet/lib/walletErrors.ts";

type CrowdfundingErrorName = ContractErrorName<typeof crowdfundingAbi>;

// Custom errors контракта, которые человек может встретить при вкладе. Ключи проверяются по ABI.
const contractErrorMessages: Partial<Record<CrowdfundingErrorName, string>> = {
  GoalWasReached: "Цель уже достигнута — контракт больше не принимает вклады в эту кампанию.",
  CampaignHasEnded: "Срок кампании истёк — вклады больше не принимаются.",
  CampaignIsCancelled: "Создатель отменил кампанию — вклады не принимаются.",
  DonationMustBeGreaterThanZero: "Сумма вклада должна быть больше нуля.",
  CampaignDoesNotExist: "Такой кампании нет в контракте.",
};

export function getTransactionErrorMessage(error: unknown): string {
  const reverted = findInCauseChain(error, (candidate) => candidate.name === "ContractFunctionRevertedError") as
    | { data?: { errorName?: string } }
    | undefined;
  const errorName = reverted?.data?.errorName;

  if (errorName) {
    return contractErrorMessages[errorName as CrowdfundingErrorName] ?? `Контракт отклонил транзакцию: ${errorName}.`;
  }

  if (findInCauseChain(error, (candidate) => candidate.name === "InsufficientFundsError")) {
    return "На кошельке не хватает ETH на сумму вклада и комиссию сети.";
  }

  return getWalletErrorMessage(error);
}

// Отказ в кошельке — не сбой: интерфейс показывает его спокойнее, чем revert или ошибку сети.
export function isUserRejection(error: unknown) {
  return findInCauseChain(error, (candidate) => candidate.code === 4001) !== undefined;
}
