"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { isAddressEqual } from "viem";

import type { CampaignDetails } from "@/entities/campaign/api/detailsApi";
import { formatEth } from "@/entities/campaign/lib/money";
import { campaignCategories, campaignCategoryLabels, type Campaign } from "@/entities/campaign/model/campaign";
import { useCampaign } from "@/entities/campaign/model/useCampaign";
import { useCampaignDetailsQuery } from "@/entities/campaign/model/useCampaignDetails";
import { useSession } from "@/features/auth/model/useAuth";
import { SignInPanel } from "@/features/auth/ui/SignInPanel/SignInPanel";
import {
  campaignDetailsLimits,
  campaignDetailsToDraft,
  type CampaignDetailsDraft,
  validateCampaignDetailsDraft,
} from "@/features/campaign-editor/lib/campaignDetailsDraft";
import { getCampaignEditorErrorMessage } from "@/features/campaign-editor/lib/campaignEditorErrors";
import { useSaveCampaignDetails } from "@/features/campaign-editor/model/useCampaignEditor";
import { CampaignCoverEditor } from "@/features/campaign-editor/ui/CampaignCoverEditor/CampaignCoverEditor";
import { Button } from "@/shared/ui/Button/Button";
import { ButtonLink } from "@/shared/ui/Button/ButtonLink";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Field } from "@/shared/ui/Field/Field";
import { Select, type SelectOption } from "@/shared/ui/Select/Select";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

import styles from "./CampaignEditor.module.scss";

type CampaignEditorProps = { id: bigint | null };
type CategoryValue = CampaignDetailsDraft["category"];

const categoryOptions: SelectOption<CategoryValue>[] = [
  { value: "", label: "Без категории" },
  ...campaignCategories.map((category) => ({ value: category, label: campaignCategoryLabels[category] })),
];

export function CampaignEditor({ id }: CampaignEditorProps) {
  if (id === null) {
    return <EditorMessage title="Неверный адрес кампании" text="Номер кампании должен быть целым неотрицательным числом." />;
  }
  return <CampaignEditorLoader id={id} />;
}

function CampaignEditorLoader({ id }: { id: bigint }) {
  const campaign = useCampaign(id);

  if (campaign.isError) {
    return (
      <EditorShell id={id}>
        <ErrorState
          action={<Button onClick={() => campaign.retry()}>Повторить</Button>}
          description="Не удалось прочитать актуальное состояние кампании в Sepolia."
          title="Кампания недоступна"
        />
      </EditorShell>
    );
  }
  if (campaign.isPending || campaign.campaign === undefined) return <EditorSkeleton id={id} />;
  if (campaign.campaign === null) return <EditorMessage id={id} title="Кампания не найдена" text={`В контракте нет кампании №${id}.`} />;

  return <CampaignEditorAccess account={campaign.account} campaign={campaign.campaign} />;
}

function CampaignEditorAccess({ account, campaign }: { account: ReturnType<typeof useCampaign>["account"]; campaign: Campaign }) {
  const session = useSession();
  const details = useCampaignDetailsQuery(campaign.id);
  const walletIsCreator = account !== undefined && isAddressEqual(account, campaign.creator);
  const sessionIsCreator = session.data !== null && session.data !== undefined && isAddressEqual(session.data.address, campaign.creator);

  if (campaign.totalRaised > 0n || details.data?.locked) {
    return (
      <EditorMessage
        id={campaign.id}
        title="Страница уже зафиксирована"
        text="Кампания получила первое пожертвование. Обложку, категорию и подробности больше нельзя изменять."
      />
    );
  }
  if (details.isPending) return <EditorSkeleton id={campaign.id} />;
  if (details.isError || !details.data) {
    return <EditorMessage id={campaign.id} title="Не удалось проверить страницу" text="Backend OpenFund недоступен. Попробуйте ещё раз позже." />;
  }
  if (session.isPending) return <EditorSkeleton id={campaign.id} />;
  if (session.isError) {
    return <EditorMessage id={campaign.id} title="Не удалось проверить вход" text="Backend OpenFund недоступен. Попробуйте ещё раз позже." />;
  }
  if (!session.data) {
    return (
      <EditorShell id={campaign.id}>
        <section className={styles.accessCard}>
          <p className={styles.eyebrow}>Подтверждение автора</p>
          <h1>{walletIsCreator ? "Войдите подписью" : "Подключите кошелёк создателя"}</h1>
          <p>
            {walletIsCreator
              ? "Backend проверит подпись сообщения. Это не транзакция: газ не нужен и средства не списываются."
              : "Управлять страницей может только адрес создателя, записанный в контракте."}
          </p>
          {walletIsCreator ? <SignInPanel /> : null}
        </section>
      </EditorShell>
    );
  }
  if (!sessionIsCreator) {
    return <EditorMessage id={campaign.id} title="Другой адрес" text="Текущая сессия принадлежит не создателю этой кампании." />;
  }

  return <CampaignDetailsForm campaign={campaign} initial={details.data} />;
}

function CampaignDetailsForm({ campaign, initial }: { campaign: Campaign; initial: CampaignDetails }) {
  const ids = { story: useId(), risks: useId() };
  const [draft, setDraft] = useState(() => campaignDetailsToDraft(initial));
  const [savedDraft, setSavedDraft] = useState(() => campaignDetailsToDraft(initial));
  const [submitted, setSubmitted] = useState(false);
  const save = useSaveCampaignDetails(campaign.id);
  const validation = validateCampaignDetailsDraft(draft);
  const errors = validation.ok ? {} : validation.errors;
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);

  const update = <Key extends keyof CampaignDetailsDraft>(key: Key, value: CampaignDetailsDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    save.reset();
  };
  const updateBudget = (index: number, key: "label" | "amount", value: string) =>
    update("budget", draft.budget.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)));
  const updatePlan = (index: number, key: "period" | "task", value: string) =>
    update("plan", draft.plan.map((step, stepIndex) => (stepIndex === index ? { ...step, [key]: value } : step)));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok || !dirty) return;
    save.mutate(validation.input, {
      onSuccess: (result) => {
        const next = campaignDetailsToDraft(result);
        setDraft(next);
        setSavedDraft(next);
        setSubmitted(false);
      },
    });
  };

  return (
    <EditorShell id={campaign.id}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Страница кампании</p>
        <h1>Расскажите о проекте подробнее</h1>
        <p>
          Эти данные хранит backend OpenFund. Изменить их можно только до первого пожертвования; финансовые условия остаются в контракте.
        </p>
      </header>

      <CampaignCoverEditor campaign={campaign} details={initial} />

      <form className={styles.form} noValidate onSubmit={submit}>
        <section aria-labelledby="editor-story" className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <p className={styles.cardKicker}>01 · История</p>
              <h2 id="editor-story">О проекте</h2>
            </div>
            <span className={styles.optional}>необязательно</span>
          </div>

          <label className={styles.label} htmlFor="campaign-category">Категория</label>
          <Select
            ariaLabel="Категория кампании"
            onChange={(category) => update("category", category)}
            options={categoryOptions}
            value={draft.category}
          />

          <TextArea
            error={submitted ? errors.story : undefined}
            hint={`${draft.story.length} / ${campaignDetailsLimits.story} символов`}
            id={ids.story}
            label="Подробная история"
            onChange={(value) => update("story", value)}
            placeholder="Какую проблему решает проект, кто его делает и какой результат получат участники"
            rows={10}
            value={draft.story}
          />
        </section>

        <section aria-labelledby="editor-budget" className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <p className={styles.cardKicker}>02 · Бюджет</p>
              <h2 id="editor-budget">На что пойдут средства</h2>
            </div>
            <span className={styles.optional}>до {campaignDetailsLimits.budgetRows} строк</span>
          </div>

          <div className={styles.rows}>
            {draft.budget.map((row, index) => (
              <div className={styles.dynamicRow} key={index}>
                <Field
                  id={`budget-label-${index}`}
                  label={`Расход ${index + 1}`}
                  onChange={(event) => updateBudget(index, "label", event.target.value)}
                  placeholder="Например, оборудование"
                  value={row.label}
                />
                <Field
                  id={`budget-amount-${index}`}
                  inputMode="decimal"
                  label="Сумма, ETH"
                  onChange={(event) => updateBudget(index, "amount", event.target.value)}
                  placeholder="0,25"
                  value={row.amount}
                />
                <Button onClick={() => update("budget", draft.budget.filter((_, rowIndex) => rowIndex !== index))} size="compact" variant="quiet">
                  Удалить
                </Button>
              </div>
            ))}
          </div>
          {submitted && errors.budget ? <p className={styles.error} role="alert">{errors.budget}</p> : null}
          <Button
            disabled={draft.budget.length >= campaignDetailsLimits.budgetRows}
            onClick={() => update("budget", [...draft.budget, { label: "", amount: "" }])}
            size="compact"
            variant="secondary"
          >
            + Добавить расход
          </Button>
          {validation.ok && validation.budgetTotal > 0n ? (
            <p className={validation.budgetTotal === campaign.goal ? styles.total : styles.warning}>
              Бюджет: {formatEth(validation.budgetTotal)}. Цель в контракте: {formatEth(campaign.goal)}.
              {validation.budgetTotal !== campaign.goal ? " Суммы не совпадают — это будет видно участникам." : ""}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="editor-plan" className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <p className={styles.cardKicker}>03 · Выполнение</p>
              <h2 id="editor-plan">План и риски</h2>
            </div>
            <span className={styles.optional}>до {campaignDetailsLimits.planSteps} этапов</span>
          </div>

          <div className={styles.rows}>
            {draft.plan.map((step, index) => (
              <div className={styles.dynamicRow} key={index}>
                <Field
                  id={`plan-period-${index}`}
                  label={`Период ${index + 1}`}
                  onChange={(event) => updatePlan(index, "period", event.target.value)}
                  placeholder="1–2 недели"
                  value={step.period}
                />
                <Field
                  id={`plan-task-${index}`}
                  label="Что будет сделано"
                  onChange={(event) => updatePlan(index, "task", event.target.value)}
                  placeholder="Подготовка и первый выпуск"
                  value={step.task}
                />
                <Button onClick={() => update("plan", draft.plan.filter((_, stepIndex) => stepIndex !== index))} size="compact" variant="quiet">
                  Удалить
                </Button>
              </div>
            ))}
          </div>
          {submitted && errors.plan ? <p className={styles.error} role="alert">{errors.plan}</p> : null}
          <Button
            disabled={draft.plan.length >= campaignDetailsLimits.planSteps}
            onClick={() => update("plan", [...draft.plan, { period: "", task: "" }])}
            size="compact"
            variant="secondary"
          >
            + Добавить этап
          </Button>

          <TextArea
            error={submitted ? errors.risks : undefined}
            hint={`${draft.risks.length} / ${campaignDetailsLimits.risks} символов`}
            id={ids.risks}
            label="Риски и ограничения"
            onChange={(value) => update("risks", value)}
            placeholder="Что может повлиять на сроки или результат и как команда снизит риск"
            rows={6}
            value={draft.risks}
          />
        </section>

        <section className={styles.saveBar}>
          <div>
            <strong>{dirty ? "Есть несохранённые изменения" : "Текстовые данные сохранены"}</strong>
            <p>Обложка сохраняется отдельно, чтобы ошибка файла не потеряла этот текст.</p>
          </div>
          <Button disabled={!dirty || !validation.ok} isLoading={save.isPending} size="large" type="submit">
            Сохранить описание
          </Button>
        </section>
        {submitted && !validation.ok ? <p className={styles.error} role="alert">Исправьте отмеченные разделы.</p> : null}
        {save.isError ? <p className={styles.error} role="alert">{getCampaignEditorErrorMessage(save.error)}</p> : null}
        {save.isSuccess ? <p className={styles.success} role="status">Описание сохранено и уже доступно на странице кампании.</p> : null}
      </form>
    </EditorShell>
  );
}

function TextArea({ error, hint, id, label, onChange, placeholder, rows, value }: {
  error?: string;
  hint: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows: number;
  value: string;
}) {
  return (
    <div className={styles.textField}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <textarea
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        aria-invalid={error ? true : undefined}
        className={[styles.textarea, error ? styles.invalid : undefined].filter(Boolean).join(" ")}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
      <p className={styles.hint} id={`${id}-hint`}>{hint}</p>
      {error ? <p className={styles.error} id={`${id}-error`}>{error}</p> : null}
    </div>
  );
}

function EditorShell({ children, id }: { children: React.ReactNode; id: bigint }) {
  return (
    <div className={styles.page}>
      <nav aria-label="Навигационная цепочка" className={styles.breadcrumbs}>
        <Link href="/campaigns">Кампании</Link><span aria-hidden="true">/</span>
        <Link href={`/campaigns/${id}`}>Кампания №{id}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">Управление</span>
      </nav>
      {children}
    </div>
  );
}

function EditorMessage({ id, text, title }: { id?: bigint; text: string; title: string }) {
  const content = (
    <section className={styles.accessCard}>
      <p className={styles.eyebrow}>Управление страницей</p>
      <h1>{title}</h1><p>{text}</p>
      <ButtonLink href={id === undefined ? "/campaigns" : `/campaigns/${id}`} variant="secondary">
        {id === undefined ? "К каталогу" : "Вернуться к кампании"}
      </ButtonLink>
    </section>
  );
  return id === undefined ? <div className={styles.page}>{content}</div> : <EditorShell id={id}>{content}</EditorShell>;
}

function EditorSkeleton({ id }: { id: bigint }) {
  return (
    <EditorShell id={id}>
      <div className={styles.skeleton}>
        <Skeleton variant="title" />
        <Skeleton variant="panel" />
        <Skeleton variant="panel" />
      </div>
    </EditorShell>
  );
}
