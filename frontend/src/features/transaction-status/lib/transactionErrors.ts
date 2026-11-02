import type { ContractErrorName } from "viem";

import type { crowdfundingAbi } from "../../../shared/config/crowdfundingAbi.ts";
import { findInCauseChain, getWalletErrorMessage } from "../../wallet/lib/walletErrors.ts";

type CrowdfundingErrorName = ContractErrorName<typeof crowdfundingAbi>;
export type ContractErrorMessages = Partial<Record<CrowdfundingErrorName, string>>;

// Ошибки, смысл которых не зависит от действия. Ключи проверяются по ABI.
const commonErrorMessages: ContractErrorMessages = {
  CampaignDoesNotExist: "Такой кампании нет в контракте.",
  OnlyCreatorCanCancel: "Отменить сбор может только его создатель.",
  OnlyCreatorCanWithdraw: "Вывести средства может только создатель кампании.",
  OnlyCreatorCanUpdateDeadline: "Менять срок может только создатель кампании.",
  CampaignAlreadyCancelled: "Кампания уже отменена.",
  FundsAlreadyWithdrawn: "Средства уже выведены.",
  GoalWasNotReached: "Цель ещё не достигнута — выводить средства рано.",
  CampaignIsStillActive: "Кампания ещё идёт — вклад можно вернуть после срока, если цель не достигнута.",
  NoContributionToRefund: "С этого адреса нет вклада в кампанию — возвращать нечего.",
  TransferFailed: "Перевод создателю не прошёл — контракт откатил вывод, средства на месте.",
  RefundFailed: "Перевод вклада не прошёл — контракт откатил возврат, вклад на месте.",
  OnlyFixedDeadlineCampaignCanUpdateDeadline: "У сбора без срока нечего менять.",
  DeadlineCannotChangeAfterFirstDonation:
    "После первого вклада срок менять нельзя: участники поддержали сбор на прежних условиях.",
  DurationMustBeGreaterThanZero: "Новый срок — хотя бы 1 день.",
  DurationTooLong: "Срок не может быть больше 365 дней.",
};

// messages — переводы конкретного действия: GoalWasReached для вклада и для возврата означает разное.
export function getTransactionErrorMessage(error: unknown, messages: ContractErrorMessages = {}): string {
  const reverted = findInCauseChain(error, (candidate) => candidate.name === "ContractFunctionRevertedError") as
    | { data?: { errorName?: string } }
    | undefined;
  const errorName = reverted?.data?.errorName;

  if (errorName) {
    const name = errorName as CrowdfundingErrorName;
    return messages[name] ?? commonErrorMessages[name] ?? `Контракт отклонил транзакцию: ${errorName}.`;
  }

  if (findInCauseChain(error, (candidate) => candidate.name === "InsufficientFundsError")) {
    return "На кошельке не хватает ETH на сумму транзакции и комиссию сети.";
  }

  return getWalletErrorMessage(error);
}

// Отказ в кошельке — не сбой: интерфейс показывает его спокойнее, чем revert или ошибку сети.
export function isUserRejection(error: unknown) {
  return findInCauseChain(error, (candidate) => candidate.code === 4001) !== undefined;
}

// Revert означает, что состояние кампании изменилось: повтор упадёт так же, нужны свежие данные.
export function isContractRevert(error: unknown) {
  return findInCauseChain(error, (candidate) => candidate.name === "ContractFunctionRevertedError") !== undefined;
}
