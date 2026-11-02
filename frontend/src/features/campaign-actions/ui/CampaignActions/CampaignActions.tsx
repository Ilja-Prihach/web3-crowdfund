"use client";

import { useId, useState, type FormEvent } from "react";

import type { CampaignAction } from "@/entities/campaign/lib/actions";
import { formatDeadlineDate } from "@/entities/campaign/lib/deadline";
import { maxDurationDays, parseDurationDays } from "@/entities/campaign/lib/duration";
import { formatEth } from "@/entities/campaign/lib/money";
import type { Campaign } from "@/entities/campaign/model/campaign";
import { TransactionStatus } from "@/features/transaction-status/ui/TransactionStatus/TransactionStatus";
import { useWalletNetwork } from "@/features/wallet/model/useWalletNetwork";
import { Button } from "@/shared/ui/Button/Button";
import { Field } from "@/shared/ui/Field/Field";

import { useCampaignAction } from "../../model/useCampaignAction";
import { useUpdateDeadline } from "../../model/useUpdateDeadline";
import styles from "./CampaignActions.module.scss";

type ManagedAction = Exclude<CampaignAction, "donate">;

// Порядок ключей — порядок кнопок: необратимая отмена всегда последняя.
const actionLabels: Record<ManagedAction, string> = {
  withdraw: "Вывести средства",
  refund: "Вернуть вклад",
  updateDeadline: "Изменить срок",
  cancel: "Отменить сбор",
};

type CampaignActionsProps = {
  campaign: Campaign;
  // Уже отфильтрованы getAvailableActions для подключённого адреса.
  actions: ManagedAction[];
  contribution: bigint;
};

export function CampaignActions({ actions, campaign, contribution }: CampaignActionsProps) {
  const fieldId = useId();
  const [selected, setSelected] = useState<ManagedAction>();
  const [daysInput, setDaysInput] = useState("");
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  // Сумма на момент отправки: после подтверждения вклад или сбор в контракте обнулится.
  const [sentAmount, setSentAmount] = useState(0n);
  const [sentDays, setSentDays] = useState(0n);
  // Время фиксируется при открытии страницы, как в карточке сбора.
  const [nowSeconds] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  // Хуки вызываются всегда — правила React; работает только выбранный.
  const withdraw = useCampaignAction(campaign.id, "withdrawFunds");
  const refund = useCampaignAction(campaign.id, "refund");
  const cancel = useCampaignAction(campaign.id, "cancelCampaign");
  const deadline = useUpdateDeadline(campaign.id);
  const { isWrongNetwork } = useWalletNetwork();
  const parsedDays = parseDurationDays(daysInput);

  const transactions = { withdraw, refund, cancel, updateDeadline: deadline };
  const transaction = selected ? transactions[selected] : undefined;

  const close = () => {
    transaction?.reset();
    setSelected(undefined);
    setDaysInput("");
    setIsSubmitAttempted(false);
  };

  if (selected && transaction && transaction.stage !== "idle") {
    const texts = {
      withdraw: {
        summary: `Вывод ${formatEth(sentAmount)} из кампании №${campaign.id}`,
        successTitle: "Средства выведены",
        successText: `${formatEth(sentAmount)} отправлены на адрес создателя. Статус кампании обновлён из сети.`,
      },
      refund: {
        summary: `Возврат ${formatEth(sentAmount)} из кампании №${campaign.id}`,
        successTitle: "Вклад вернулся",
        successText: `${formatEth(sentAmount)} отправлены обратно на ваш кошелёк. Сумма сбора обновлена из сети.`,
      },
      cancel: {
        summary: `Отмена кампании №${campaign.id}`,
        successTitle: "Сбор отменён",
        successText: "Кампания больше не принимает вклады. Участники могут вернуть свои средства.",
      },
      updateDeadline: {
        summary: `Новый срок кампании №${campaign.id}: ${sentDays} дн. от подтверждения`,
        successTitle: "Срок изменён",
        successText: "Новый дедлайн записан в контракте и уже показан на странице.",
      },
    }[selected];

    return (
      <TransactionStatus
        {...texts}
        editLabel="Назад к действиям"
        error={transaction.error}
        errorMessages={transaction.errorMessages}
        hash={transaction.hash}
        onDone={close}
        onRefresh={() => {
          transaction.refresh();
          close();
        }}
        onRetry={() => (selected === "updateDeadline" ? deadline.updateDeadline(sentDays) : transactions[selected].start())}
        stage={transaction.stage}
      />
    );
  }

  if (selected === "cancel") {
    return (
      <section aria-labelledby={`${fieldId}-cancel`} className={styles.confirm}>
        <h3 id={`${fieldId}-cancel`}>Отменить сбор?</h3>
        <p>
          Отмена необратима: кампания перестанет принимать вклады, а участники смогут вернуть свои средства. Вывести
          деньги после отмены будет нельзя.
        </p>
        <div className={styles.buttons}>
          <Button className={styles.danger} fullWidth onClick={() => cancel.start()}>
            Да, отменить сбор
          </Button>
          <Button fullWidth onClick={close} variant="quiet">
            Назад
          </Button>
        </div>
      </section>
    );
  }

  if (selected === "updateDeadline") {
    const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitAttempted(true);
      if (!parsedDays.ok) return;
      setSentDays(parsedDays.days);
      deadline.updateDeadline(parsedDays.days);
    };
    const showError = !parsedDays.ok && (isSubmitAttempted || daysInput.trim() !== "");
    // Прикидка: контракт отсчитает дни от времени блока, а не от этой минуты.
    const preview = parsedDays.ok
      ? `Примерно до ${formatDeadlineDate(nowSeconds + parsedDays.days * 86_400n)}. Отсчёт идёт от подтверждения, а не от старого срока.`
      : `От 1 до ${maxDurationDays} дней. Отсчёт идёт от подтверждения, а не от старого срока.`;

    return (
      <form className={styles.confirm} noValidate onSubmit={submit}>
        <Field
          autoComplete="off"
          error={showError && !parsedDays.ok ? parsedDays.error : undefined}
          hint={preview}
          id={fieldId}
          inputMode="numeric"
          label="Новый срок, дней"
          onChange={(event) => setDaysInput(event.target.value)}
          placeholder="30"
          value={daysInput}
        />
        <p className={styles.note}>Сейчас: до {formatDeadlineDate(campaign.deadline)}. После первого вклада срок изменить нельзя.</p>
        <div className={styles.buttons}>
          <Button fullWidth type="submit">
            Сохранить срок
          </Button>
          <Button fullWidth onClick={close} variant="quiet">
            Назад
          </Button>
        </div>
      </form>
    );
  }

  const start = (action: ManagedAction) => {
    setSelected(action);
    if (action === "withdraw") {
      setSentAmount(campaign.totalRaised);
      withdraw.start();
    }
    if (action === "refund") {
      setSentAmount(contribution);
      refund.start();
    }
  };

  const ordered = (Object.keys(actionLabels) as ManagedAction[]).filter((action) => actions.includes(action));

  return (
    <div className={styles.actions}>
      <p className={styles.label}>{actions.includes("refund") && actions.length === 1 ? "Ваш вклад" : "Управление сбором"}</p>
      {ordered.map((action) => (
        <Button
          className={action === "cancel" ? styles.cancel : undefined}
          disabled={isWrongNetwork}
          fullWidth
          key={action}
          onClick={() => start(action)}
          variant={action === "withdraw" ? "accent" : action === "cancel" ? "quiet" : "secondary"}
        >
          {actionLabels[action]}
          {action === "refund" ? ` · ${formatEth(contribution)}` : null}
          {action === "withdraw" ? ` · ${formatEth(campaign.totalRaised)}` : null}
        </Button>
      ))}
      {isWrongNetwork ? (
        <p className={styles.note}>Кошелёк подключён к другой сети. Переключитесь на Sepolia — кнопка есть под шапкой.</p>
      ) : null}
    </div>
  );
}
