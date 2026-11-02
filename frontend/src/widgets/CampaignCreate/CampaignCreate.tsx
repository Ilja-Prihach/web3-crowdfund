"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type CSSProperties, type FormEvent } from "react";
import { formatEther } from "viem";
import { useConnection } from "wagmi";

import { CampaignArtwork } from "@/entities/campaign/CampaignArtwork/CampaignArtwork";
import { CampaignProgress } from "@/entities/campaign/CampaignProgress/CampaignProgress";
import { CampaignStatus } from "@/entities/campaign/CampaignStatus/CampaignStatus";
import { formatDeadlineDate } from "@/entities/campaign/lib/deadline";
import { maxDurationDays } from "@/entities/campaign/lib/duration";
import { formatEth } from "@/entities/campaign/lib/money";
import {
  type CampaignDraft,
  maxDescriptionBytes,
  maxTitleBytes,
  validateCampaignDraft,
} from "@/features/campaign-create/lib/campaignDraft";
import { useCreateCampaign } from "@/features/campaign-create/model/useCreateCampaign";
import { TransactionStatus } from "@/features/transaction-status/ui/TransactionStatus/TransactionStatus";
import { useWalletNetwork } from "@/features/wallet/model/useWalletNetwork";
import { addressHue, shortenAddress } from "@/shared/lib/address";
import { parseEthAmount } from "@/shared/lib/ethAmount";
import { utf8ByteLength } from "@/shared/lib/utf8";
import { Button } from "@/shared/ui/Button/Button";
import { Field } from "@/shared/ui/Field/Field";

import styles from "./CampaignCreate.module.scss";

type FieldName = "title" | "description" | "goal" | "durationDays";

const emptyDraft: CampaignDraft = {
  title: "",
  description: "",
  goal: "",
  fundingMode: "fixedDeadline",
  durationDays: "30",
};

const modes = [
  {
    value: "fixedDeadline",
    code: "FixedDeadline",
    title: "Собрать к сроку",
    text: "Если цель не собрана к сроку, участники вернут вклады.",
  },
  {
    value: "openEnded",
    code: "OpenEnded",
    title: "Открытая цель",
    text: "Сбор идёт до цели. Участник может вернуть вклад в любой момент до неё.",
  },
] as const;

const day = 24 * 60 * 60;

// Строка для блока «что уйдёт в контракт»: длинный текст обрезается только в показе.
function preview(value: string, limit: number) {
  const trimmed = value.trim();
  return trimmed.length > limit ? `${trimmed.slice(0, limit)}…` : trimmed;
}

export function CampaignCreate() {
  const ids = { title: useId(), description: useId(), goal: useId(), duration: useId() };
  const router = useRouter();
  const { address } = useConnection();
  const { isConnected, isWrongNetwork } = useWalletNetwork();
  const create = useCreateCampaign();

  const [draft, setDraft] = useState(emptyDraft);
  const [touched, setTouched] = useState<Set<FieldName>>(new Set());
  const [isSubmitAttempted, setIsSubmitAttempted] = useState(false);
  // Время фиксируется при открытии страницы, как в каталоге: дата окончания приблизительная.
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));

  const validation = validateCampaignDraft(draft);
  const errors = validation.ok ? {} : validation.errors;
  const errorFor = (field: FieldName) => (isSubmitAttempted || touched.has(field) ? errors[field] : undefined);
  const touch = (field: FieldName) => setTouched((current) => new Set(current).add(field));
  const update = <Key extends keyof CampaignDraft>(key: Key, value: CampaignDraft[Key]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const isFixed = draft.fundingMode === "fixedDeadline";
  const goal = parseEthAmount(draft.goal);
  const goalWei = goal.ok ? goal.wei : 0n;
  const days = Number(draft.durationDays);
  const hasValidDays = !errors.durationDays && Number.isInteger(days) && days > 0;
  const approximateEnd = hasValidDays ? formatDeadlineDate(BigInt(nowSeconds + days * day)) : null;
  const isBusy = create.stage === "signing" || create.stage === "confirming";

  // Созданная кампания открывается сразу: ID пришёл из события CampaignCreated в receipt.
  useEffect(() => {
    if (create.createdId !== undefined) router.push(`/campaigns/${create.createdId}`);
  }, [create.createdId, router]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitAttempted(true);
    if (validation.ok) create.start(validation.args);
  };

  const blockReason = !isConnected
    ? "Подключите кошелёк в шапке сайта: создателем кампании станет его адрес."
    : isWrongNetwork
      ? "Кошелёк подключён к другой сети. Переключитесь на Sepolia — кнопка есть в полосе под шапкой."
      : null;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Новый сбор</p>
        <h1 className={styles.title}>Расскажите о проекте и задайте правила</h1>
        <p className={styles.lead}>
          Кампания записывается в контракт OpenFund V2 одной транзакцией. После запуска её условия исполняет контракт.
        </p>
      </header>

      <div className={styles.layout}>
        <form className={styles.form} noValidate onSubmit={submit}>
          <fieldset className={styles.fieldset} disabled={isBusy}>
            <section aria-labelledby="step-about" className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.step}>1</span>
                <div>
                  <h2 id="step-about">Описание</h2>
                  <p>Название и описание хранятся в контракте. Лимиты считаются в байтах: кириллица занимает по 2.</p>
                </div>
              </div>

              <Field
                autoComplete="off"
                error={errorFor("title")}
                hint={`${utf8ByteLength(draft.title.trim())} / ${maxTitleBytes} байт`}
                id={ids.title}
                label="Название"
                onBlur={() => touch("title")}
                onChange={(event) => update("title", event.target.value)}
                placeholder="Например, библиотека инструментов в подъезде"
                required
                value={draft.title}
              />

              <div className={styles.textField}>
                <label className={styles.textLabel} htmlFor={ids.description}>
                  Описание
                </label>
                <textarea
                  aria-describedby={`${ids.description}-hint${errorFor("description") ? ` ${ids.description}-error` : ""}`}
                  aria-invalid={errorFor("description") ? true : undefined}
                  className={[styles.textarea, errorFor("description") ? styles.textareaError : undefined]
                    .filter(Boolean)
                    .join(" ")}
                  id={ids.description}
                  onBlur={() => touch("description")}
                  onChange={(event) => update("description", event.target.value)}
                  placeholder="Что сделаете, зачем это нужно и на что пойдут средства"
                  rows={6}
                  value={draft.description}
                />
                <p className={styles.textHint} id={`${ids.description}-hint`}>
                  {utf8ByteLength(draft.description.trim())} / {maxDescriptionBytes} байт
                </p>
                {errorFor("description") ? (
                  <p className={styles.textError} id={`${ids.description}-error`}>
                    {errorFor("description")}
                  </p>
                ) : null}
              </div>
            </section>

            <section aria-labelledby="step-rules" className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.step}>2</span>
                <div>
                  <h2 id="step-rules">Режим и цель</h2>
                  <p>Эти параметры определяют, когда и кому достанутся средства.</p>
                </div>
              </div>

              <div aria-label="Режим финансирования" className={styles.modes} role="radiogroup">
                {modes.map((mode) => (
                  <label className={styles.mode} data-checked={draft.fundingMode === mode.value || undefined} key={mode.value}>
                    <input
                      checked={draft.fundingMode === mode.value}
                      className={styles.radio}
                      name="fundingMode"
                      onChange={() => update("fundingMode", mode.value)}
                      type="radio"
                      value={mode.value}
                    />
                    <span className={styles.modeCode}>{mode.code}</span>
                    <span className={styles.modeTitle}>{mode.title}</span>
                    <span className={styles.modeText}>{mode.text}</span>
                  </label>
                ))}
              </div>

              <div className={styles.row}>
                <Field
                  autoComplete="off"
                  error={errorFor("goal")}
                  hint="Последний вклад может превысить цель"
                  id={ids.goal}
                  inputMode="decimal"
                  label="Цель сбора, ETH"
                  onBlur={() => touch("goal")}
                  onChange={(event) => update("goal", event.target.value)}
                  placeholder="0,05"
                  required
                  value={draft.goal}
                />
                {isFixed ? (
                  <Field
                    autoComplete="off"
                    error={errorFor("durationDays")}
                    hint={`От 1 до ${maxDurationDays} дней`}
                    id={ids.duration}
                    inputMode="numeric"
                    label="Длительность, дней"
                    onBlur={() => touch("durationDays")}
                    onChange={(event) => update("durationDays", event.target.value)}
                    required
                    value={draft.durationDays}
                  />
                ) : null}
              </div>

              {isFixed ? (
                <p className={styles.endDate}>
                  <span>Сбор завершится</span>
                  <strong>{approximateEnd ? `около ${approximateEnd}` : "—"}</strong>
                </p>
              ) : null}

              <p className={styles.warning}>
                Название, описание, цель и режим нельзя изменить после запуска.
                {isFixed ? " Срок можно поменять только до первого вклада." : ""}
              </p>
            </section>
          </fieldset>

          <section aria-labelledby="step-launch" className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.step}>3</span>
              <div>
                <h2 id="step-launch">Проверка и запуск</h2>
                <p>Кошелёк покажет эту транзакцию перед подписью. Комиссию сети платит создатель.</p>
              </div>
            </div>

            {create.stage === "idle" ? (
              <>
                <Button disabled={blockReason !== null} fullWidth size="large" type="submit">
                  Создать кампанию
                </Button>
                {blockReason ? <p className={styles.blocked}>{blockReason}</p> : null}
                {isSubmitAttempted && !validation.ok ? (
                  <p className={styles.blocked} role="alert">
                    Исправьте отмеченные поля — до подписи ничего не отправлено.
                  </p>
                ) : null}
              </>
            ) : (
              <TransactionStatus
                editLabel="Вернуться к форме"
                error={create.error}
                hash={create.hash}
                onDone={create.reset}
                onRefresh={() => {
                  create.refresh();
                  create.reset();
                }}
                onRetry={() => {
                  if (validation.ok) create.start(validation.args);
                }}
                stage={create.stage}
                successText="Кампания записана в контракт. Открываем её страницу…"
                successTitle="Кампания создана"
                summary={`Новая кампания: ${preview(draft.title, 40)}`}
              />
            )}
          </section>
        </form>

        <aside className={styles.aside}>
          <p className={styles.asideLabel}>Так кампанию увидят участники</p>
          <article className={styles.previewCard}>
            <CampaignArtwork fundingMode={draft.fundingMode} id={0n}>
              <CampaignStatus className={styles.previewStatus} status="active" />
              <span className={styles.previewTerm}>{isFixed ? (hasValidDays ? `${days} дн.` : "срок?") : "Без срока"}</span>
            </CampaignArtwork>
            <div className={styles.previewBody}>
              <h3>{draft.title.trim() || "Название кампании"}</h3>
              <p className={styles.previewDescription}>{draft.description.trim() || "Описание появится здесь."}</p>
              <CampaignProgress goal={goalWei} status="active" totalRaised={0n} />
              <p className={styles.previewCreator}>
                <span
                  aria-hidden="true"
                  className={styles.avatar}
                  style={{ "--avatar-hue": address ? addressHue(address) : 150 } as CSSProperties}
                />
                {address ? shortenAddress(address) : "ваш адрес"}
              </p>
            </div>
          </article>

          <section aria-label="Что уйдёт в контракт" className={styles.callCard}>
            <p className={styles.callTitle}>Что уйдёт в контракт</p>
            <pre className={styles.call}>
              <code>
                {`createCampaign(\n  "${preview(draft.title, 24)}",\n  "${preview(draft.description, 24)}",\n  ${goalWei}, // ${goal.ok ? formatEther(goalWei) : "?"} ETH\n  ${isFixed ? "FixedDeadline" : "OpenEnded"},\n  ${isFixed ? (hasValidDays ? days : "?") : 0}${isFixed ? " // дней" : ""}\n)`}
              </code>
            </pre>
            {goal.ok ? <p className={styles.callNote}>Цель: {formatEth(goalWei)} — в контракте хранится в wei.</p> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
