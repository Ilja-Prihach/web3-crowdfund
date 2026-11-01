import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ContractFunctionRevertedError,
  encodeErrorResult,
  InsufficientFundsError,
  UserRejectedRequestError,
} from "viem";

import { crowdfundingAbi } from "../../../shared/config/crowdfundingAbi.ts";
import { getTransactionErrorMessage, isContractRevert, isUserRejection } from "./transactionErrors.ts";

// Так viem сообщает о revert: ошибка с декодированным по ABI именем внутри обёртки wagmi.
function reverted(errorName: "GoalWasReached" | "CampaignHasEnded" | "OnlyCreatorCanCancel") {
  const data = encodeErrorResult({ abi: crowdfundingAbi, errorName });
  const error = new ContractFunctionRevertedError({ abi: crowdfundingAbi, data, functionName: "donate" });
  return Object.assign(new Error("wrapped"), { cause: error });
}

describe("getTransactionErrorMessage", () => {
  it("переводит custom errors контракта", () => {
    assert.match(getTransactionErrorMessage(reverted("GoalWasReached")), /Цель уже достигнута/);
    assert.match(getTransactionErrorMessage(reverted("CampaignHasEnded")), /Срок кампании истёк/);
  });

  it("называет непереведённую ошибку контракта по имени", () => {
    assert.equal(
      getTransactionErrorMessage(reverted("OnlyCreatorCanCancel")),
      "Контракт отклонил транзакцию: OnlyCreatorCanCancel.",
    );
  });

  it("сообщает о нехватке ETH", () => {
    const error = new InsufficientFundsError();
    assert.match(getTransactionErrorMessage(error), /не хватает ETH/);
  });

  it("передаёт ошибки кошелька общему переводу", () => {
    const error = new UserRejectedRequestError(new Error("User denied"));
    assert.match(getTransactionErrorMessage(error), /отменили запрос/);
  });
});

describe("isUserRejection", () => {
  it("отличает отказ в кошельке от revert", () => {
    const rejection = Object.assign(new Error("wrapped"), { cause: new UserRejectedRequestError(new Error("User denied")) });
    assert.equal(isUserRejection(rejection), true);
    assert.equal(isUserRejection(reverted("GoalWasReached")), false);
  });
});

describe("isContractRevert", () => {
  it("узнаёт revert контракта и не путает его с нехваткой ETH", () => {
    assert.equal(isContractRevert(reverted("GoalWasReached")), true);
    assert.equal(isContractRevert(new InsufficientFundsError()), false);
  });
});
