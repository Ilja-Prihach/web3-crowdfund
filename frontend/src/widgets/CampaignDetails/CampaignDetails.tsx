"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";

import { CampaignArtwork } from "@/entities/campaign/CampaignArtwork/CampaignArtwork";
import { CampaignStatus } from "@/entities/campaign/CampaignStatus/CampaignStatus";
import { type CampaignAction, getAvailableActions } from "@/entities/campaign/lib/actions";
import { formatDeadlineDate, formatTimeLeft } from "@/entities/campaign/lib/deadline";
import { formatEth, getProgressPercent } from "@/entities/campaign/lib/money";
import { type Campaign, fundingModeLabels } from "@/entities/campaign/model/campaign";
import { useCampaign } from "@/entities/campaign/model/useCampaign";
import { contractExplorerUrl, supportedChain } from "@/shared/config/web3";
import { addressHue, shortenAddress } from "@/shared/lib/address";
import { Button } from "@/shared/ui/Button/Button";
import { ButtonLink } from "@/shared/ui/Button/ButtonLink";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

import styles from "./CampaignDetails.module.scss";

const actionLabels: Record<CampaignAction, string> = {
  donate: "Поддержать",
  withdraw: "Вывести средства",
  cancel: "Отменить сбор",
  updateDeadline: "Изменить срок",
  refund: "Вернуть вклад",
};

// Почему у кампании нет действий для этого посетителя.
const closedReasons: Record<Campaign["status"], string> = {
  active: "",
  successful: "Цель достигнута. Вывести средства может только создатель.",
  withdrawn: "Создатель вывел средства, сбор завершён.",
  failed: "Срок истёк до достижения цели. Участники могут вернуть свои вклады.",
  cancelled: "Создатель отменил сбор. Участники могут вернуть свои вклады.",
};

const refundRules: Record<Campaign["fundingMode"], string> = {
  fixedDeadline: "Если цель не достигнута к сроку или сбор отменён",
  openEnded: "В любой момент, пока цель не достигнута",
};

const explorerUrl = supportedChain.blockExplorers.default.url;

type CampaignDetailsProps = {
  // null — ID из адреса не прошёл проверку.
  id: bigint | null;
};

export function CampaignDetails({ id }: CampaignDetailsProps) {
  if (id === null) {
    return (
      <PageMessage
        description="Номер кампании в адресе должен быть целым числом без лишних символов, например /campaigns/3."
        title="Неверный адрес кампании"
      />
    );
  }

  return <CampaignDetailsLoader id={id} />;
}

function CampaignDetailsLoader({ id }: { id: bigint }) {
  const details = useCampaign(id);

  if (details.isError) {
    return (
      <div className={styles.page}>
        <ErrorState
          action={
            <Button onClick={() => details.retry()} variant="secondary">
              Повторить
            </Button>
          }
          description="RPC-узел Sepolia не ответил. Кампания и средства не пострадали: они хранятся в контракте."
          title="Не удалось прочитать кампанию"
        />
      </div>
    );
  }

  if (details.isPending || details.campaign === undefined) return <CampaignDetailsSkeleton />;

  if (details.campaign === null) {
    return (
      <PageMessage
        description={`В контракте V2 нет кампании №${id}. Возможно, она ещё не создана или ссылка содержит опечатку.`}
        title="Кампания не найдена"
      />
    );
  }

  return (
    <CampaignView account={details.account} campaign={details.campaign} contribution={details.contribution} />
  );
}

type CampaignViewProps = {
  campaign: Campaign;
  account: ReturnType<typeof useCampaign>["account"];
  contribution: bigint | undefined;
};

function CampaignView({ account, campaign, contribution }: CampaignViewProps) {
  // Время фиксируется при открытии страницы, как в каталоге.
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const percent = getProgressPercent(campaign.totalRaised, campaign.goal);
  const actions = getAvailableActions(campaign, account, contribution ?? 0n);
  const isFixed = campaign.fundingMode === "fixedDeadline";
  const timeLeft = isFixed && campaign.status === "active" ? formatTimeLeft(campaign.deadline, nowSeconds) : null;
  const isClosedWithoutSuccess = campaign.status === "failed" || campaign.status === "cancelled";

  return (
    <div className={styles.page}>
      <nav aria-label="Навигационная цепочка" className={styles.breadcrumbs}>
        <Link href="/campaigns">Кампании</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{campaign.title}</span>
      </nav>

      <div className={styles.layout}>
        <header className={styles.head}>
          <div className={styles.cover}>
            <CampaignArtwork
              fundingMode={campaign.fundingMode}
              id={campaign.id}
              muted={isClosedWithoutSuccess}
              priority
              sizes="(max-width: 959px) calc(100vw - 2rem), 760px"
            />
          </div>

          <ul aria-label="Параметры кампании" className={styles.chips}>
            <li>
              <CampaignStatus status={campaign.status} />
            </li>
            <li className={styles.chip}>
              {isFixed ? `до ${formatDeadlineDate(campaign.deadline)}` : "Без срока"}
            </li>
            <li className={[styles.chip, styles.chipOutline].join(" ")}>{fundingModeLabels[campaign.fundingMode]}</li>
          </ul>

          <h1 className={styles.title}>{campaign.title}</h1>

          <div className={styles.creator}>
            <span
              aria-hidden="true"
              className={styles.avatar}
              style={{ "--avatar-hue": addressHue(campaign.creator) } as CSSProperties}
            />
            <div>
              <a
                className={styles.creatorAddress}
                href={`${explorerUrl}/address/${campaign.creator}`}
                rel="noreferrer"
                target="_blank"
                title={campaign.creator}
              >
                {shortenAddress(campaign.creator)} <span aria-hidden="true">↗</span>
              </a>
              <p className={styles.creatorRole}>Создатель кампании · адрес в Etherscan</p>
            </div>
          </div>
        </header>

        <aside className={styles.aside}>
          <section aria-label="Сбор средств" className={styles.panel}>
            <p className={styles.raised}>{formatEth(campaign.totalRaised)}</p>
            <p className={styles.goal}>собрано из {formatEth(campaign.goal)}</p>
            <div aria-hidden="true" className={[styles.track, styles[campaign.status]].join(" ")}>
              <span style={{ width: `${Math.min(percent, 100)}%` }} />
            </div>

            <dl className={styles.stats}>
              <div>
                <dt>цели</dt>
                <dd>{percent}%</dd>
              </div>
              <div>
                <dt>ваш вклад</dt>
                <dd>{account === undefined ? "—" : contribution === undefined ? "…" : formatEth(contribution)}</dd>
              </div>
              <div>
                <dt>{timeLeft ? "осталось" : "срок"}</dt>
                <dd>{isFixed ? (timeLeft ?? "завершён") : "без срока"}</dd>
              </div>
            </dl>

            {account === undefined ? (
              <p className={styles.hint}>Подключите кошелёк, чтобы увидеть свой вклад и доступные действия.</p>
            ) : null}

            {actions.length > 0 ? (
              <>
                <p className={styles.actionPreview}>Предпросмотр доступных действий</p>
                <div className={styles.actions}>
                  {actions.map((action) => (
                    <Button
                      disabled
                      fullWidth
                      key={action}
                      variant={action === "donate" ? "primary" : "secondary"}
                    >
                      {actionLabels[action]}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <p className={styles.closed}>{closedReasons[campaign.status]}</p>
            )}

            <p className={styles.notice}>
              Пока доступны только чтение контракта и предпросмотр действий.
            </p>
          </section>

          <ButtonLink fullWidth href="/campaigns" variant="secondary">
            <span aria-hidden="true">←</span> Все кампании
          </ButtonLink>
        </aside>

        {/* После панели сбора в DOM: на mobile сумма и действия идут раньше длинного текста. */}
        <div className={styles.about}>
          <section aria-labelledby="about-title" className={styles.story}>
            <h2 id="about-title">О проекте</h2>
            <p className={styles.description}>{campaign.description}</p>
            <p className={styles.onchainNote}>
              <span className={styles.onchainBadge}>On-chain</span>
              <span>
                Название и описание записаны при создании и не меняются. {" "}
                <a href={contractExplorerUrl} rel="noreferrer" target="_blank">
                  Кампания №{campaign.id.toString()} в V2 <span aria-hidden="true">↗</span>
                </a>
              </span>
            </p>
          </section>

          <section aria-labelledby="rules-title" className={styles.detailsSection}>
            <h2 id="rules-title">Правила этого сбора</h2>
            <div className={styles.ruleCards}>
              <article>
                <span>Успех</span>
                <strong>При {formatEth(campaign.goal)}</strong>
                <p>После достижения цели создатель может вывести собранные средства.</p>
              </article>
              <article>
                <span>Срок</span>
                <strong>{isFixed ? formatDeadlineDate(campaign.deadline) : "Без дедлайна"}</strong>
                <p>{isFixed ? "Если цель не собрана к сроку, кампания завершается." : "Сбор идёт до цели или отмены создателем."}</p>
              </article>
              <article>
                <span>Возврат</span>
                <strong>{refundRules[campaign.fundingMode]}</strong>
                <p>Возврат выполняется самим участником по правилам контракта.</p>
              </article>
            </div>
          </section>

          <section aria-labelledby="trust-title" className={styles.detailsSection}>
            <h2 id="trust-title">Граница доверия</h2>
            <div className={styles.trustGrid}>
              <article className={styles.guarantee}>
                <span>Контракт гарантирует</span>
                <p>Хранение цели и условий, учёт ETH и доступность вывода или возврата только по правилам V2.</p>
              </article>
              <article className={styles.limitation}>
                <span>Контракт не гарантирует</span>
                <p>Личность автора, качество результата и выполнение обещанного проекта после получения средств.</p>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CampaignDetailsSkeleton() {
  return (
    <div aria-busy="true" className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.head}>
          <Skeleton label="Загрузка кампании" variant="panel" />
          <Skeleton variant="title" />
          <Skeleton />
          <Skeleton />
        </div>
        <div className={styles.aside}>
          <Skeleton variant="panel" />
        </div>
      </div>
    </div>
  );
}

function PageMessage({ description, title }: { description: string; title: string }) {
  return (
    <div className={styles.page}>
      <section className={styles.message}>
        <p className={styles.messageLabel}>Кампания</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <ButtonLink href="/campaigns" variant="secondary">
          <span aria-hidden="true">←</span> Все кампании
        </ButtonLink>
      </section>
    </div>
  );
}
