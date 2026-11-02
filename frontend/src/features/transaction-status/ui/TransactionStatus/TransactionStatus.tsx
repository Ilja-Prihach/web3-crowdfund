import type { Hash } from "viem";

import { supportedChain } from "@/shared/config/web3";
import { shortenAddress } from "@/shared/lib/address";
import { Button } from "@/shared/ui/Button/Button";

import {
  type ContractErrorMessages,
  getTransactionErrorMessage,
  isContractRevert,
  isUserRejection,
} from "../../lib/transactionErrors";
import styles from "./TransactionStatus.module.scss";

export type TransactionStage = "signing" | "confirming" | "confirmed" | "failed";

type TransactionStatusProps = {
  stage: TransactionStage;
  // Что именно подписывается: «Вклад 0,01 ETH в кампанию №5».
  summary: string;
  successTitle: string;
  // Кнопка возврата к форме после сбоя: «Изменить сумму» для вклада, «Вернуться к форме» для создания.
  editLabel?: string;
  successText: string;
  hash?: Hash;
  error?: unknown;
  // Переводы ошибок контракта для этого действия; остальные берутся из общего словаря.
  errorMessages?: ContractErrorMessages;
  onRetry: () => void;
  // После revert повтор бессмыслен: состояние кампании изменилось, его нужно перечитать.
  onRefresh: () => void;
  onDone: () => void;
};

const completedSteps: Record<TransactionStage, number> = {
  signing: 1,
  confirming: 2,
  confirmed: 3,
  failed: 0,
};

export function TransactionStatus({
  editLabel = "Изменить сумму",
  error,
  errorMessages,
  hash,
  onDone,
  onRefresh,
  onRetry,
  stage,
  successText,
  successTitle,
  summary,
}: TransactionStatusProps) {
  const txUrl = hash ? `${supportedChain.blockExplorers.default.url}/tx/${hash}` : undefined;
  const isRejected = stage === "failed" && isUserRejection(error);

  return (
    <section aria-live="polite" className={[styles.status, styles[stage]].join(" ")}>
      {stage !== "failed" ? (
        <ol aria-label="Этапы транзакции" className={styles.steps}>
          {["Подпись", "Сеть", "Готово"].map((label, index) => (
            <li data-done={index < completedSteps[stage] || undefined} key={label}>
              <span className={styles.visuallyHidden}>{label}</span>
            </li>
          ))}
        </ol>
      ) : null}

      <div aria-hidden="true" className={styles.icon}>
        {stage === "signing" ? "✍" : stage === "confirming" ? "⧗" : stage === "confirmed" ? "✓" : isRejected ? "✕" : "!"}
      </div>

      <h3 className={styles.title}>
        {stage === "signing"
          ? "Подтвердите в кошельке"
          : stage === "confirming"
            ? "Транзакция отправлена"
            : stage === "confirmed"
              ? successTitle
              : isRejected
                ? "Вы отменили подпись"
                : "Транзакция не прошла"}
      </h3>

      <p className={styles.text}>
        {stage === "signing"
          ? "Проверьте сумму и адрес контракта во всплывающем окне кошелька."
          : stage === "confirming"
            ? "Обычно Sepolia подтверждает транзакцию за 10–30 секунд. Не закрывайте страницу, чтобы увидеть результат."
            : stage === "confirmed"
              ? successText
              : isRejected
                ? "Ничего не отправлено, ETH остались в кошельке."
                : getTransactionErrorMessage(error, errorMessages)}
      </p>

      <p className={styles.summary}>{summary}</p>

      {txUrl && hash ? (
        <a className={styles.hash} href={txUrl} rel="noreferrer" target="_blank">
          Транзакция {shortenAddress(hash)} <span aria-hidden="true">↗</span>
        </a>
      ) : null}

      {stage === "failed" ? (
        <div className={styles.buttons}>
          {isContractRevert(error) ? (
            <Button fullWidth onClick={onRefresh}>
              Обновить кампанию
            </Button>
          ) : (
            <Button fullWidth onClick={onRetry}>
              Повторить
            </Button>
          )}
          <Button fullWidth onClick={onDone} variant="quiet">
            {editLabel}
          </Button>
        </div>
      ) : stage === "confirmed" ? (
        <Button fullWidth onClick={onDone} variant="secondary">
          Готово
        </Button>
      ) : null}
    </section>
  );
}
