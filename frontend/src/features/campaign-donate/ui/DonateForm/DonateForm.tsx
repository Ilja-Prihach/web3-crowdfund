"use client";

import { useId, useState, type FormEvent } from "react";

import { formatEth } from "@/entities/campaign/lib/money";
import { TransactionStatus } from "@/features/transaction-status/ui/TransactionStatus/TransactionStatus";
import { useWalletNetwork } from "@/features/wallet/model/useWalletNetwork";
import { parseEthAmount } from "@/shared/lib/ethAmount";
import { Button } from "@/shared/ui/Button/Button";
import { Field } from "@/shared/ui/Field/Field";

import { useDonate } from "../../model/useDonate";
import styles from "./DonateForm.module.scss";

const quickAmounts = ["0,001", "0,005", "0,01"];

type DonateFormProps = {
  campaignId: bigint;
  // Сколько осталось до цели: подсказка, а не ограничение — контракт принимает и больший вклад.
  remaining: bigint;
};

export function DonateForm({ campaignId, remaining }: DonateFormProps) {
  const fieldId = useId();
  const [input, setInput] = useState("");
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  // Сумма отправленной транзакции: её показывает статус и её же повторяет «Повторить».
  const [sentAmount, setSentAmount] = useState<bigint>();
  const { isConnected, isWrongNetwork } = useWalletNetwork();
  const donation = useDonate(campaignId);
  const parsed = parseEthAmount(input);
  const showError = !parsed.ok && (isSubmitAttempted || input.trim() !== "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);
    if (!parsed.ok) return;

    setSentAmount(parsed.wei);
    donation.donate(parsed.wei);
  };

  const closeStatus = () => {
    if (donation.stage === "confirmed") setInput("");
    donation.reset();
    setSentAmount(undefined);
    setIsSubmitAttempted(false);
  };

  if (donation.stage !== "idle" && sentAmount !== undefined) {
    return (
      <TransactionStatus
        error={donation.error}
        errorMessages={donation.errorMessages}
        hash={donation.hash}
        onDone={closeStatus}
        onRefresh={() => {
          donation.refresh();
          closeStatus();
        }}
        onRetry={() => donation.donate(sentAmount)}
        stage={donation.stage}
        successText={`${formatEth(sentAmount)} учтены в кампании. Сумма сбора и ваш вклад обновлены из сети.`}
        successTitle="Спасибо! Вклад в контракте"
        summary={`Вклад ${formatEth(sentAmount)} в кампанию №${campaignId}`}
      />
    );
  }

  const blockReason = !isConnected
    ? "Подключите кошелёк в шапке сайта, чтобы поддержать кампанию."
    : isWrongNetwork
      ? "Кошелёк подключён к другой сети. Переключитесь на Sepolia — кнопка есть в полосе под шапкой."
      : null;

  return (
    <form className={styles.form} noValidate onSubmit={submit}>
      <Field
        autoComplete="off"
        error={showError && !parsed.ok ? parsed.error : undefined}
        hint={remaining > 0n ? `До цели осталось ${formatEth(remaining)}` : undefined}
        id={fieldId}
        inputMode="decimal"
        label="Сумма вклада, ETH"
        onChange={(event) => setInput(event.target.value)}
        placeholder="0,01"
        value={input}
      />

      <div aria-label="Быстрый выбор суммы" className={styles.quick} role="group">
        {quickAmounts.map((amount) => (
          <button
            aria-pressed={input === amount}
            className={styles.quickAmount}
            key={amount}
            onClick={() => setInput(amount)}
            type="button"
          >
            {amount} ETH
          </button>
        ))}
      </div>

      <Button disabled={blockReason !== null} fullWidth size="large" type="submit">
        Поддержать
      </Button>
      {blockReason ? <p className={styles.blocked}>{blockReason}</p> : null}
    </form>
  );
}
