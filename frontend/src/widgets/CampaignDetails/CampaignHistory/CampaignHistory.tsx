"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Address } from "viem";

import type { ActivityItem, ActivityType, Donor } from "@/entities/campaign/api/historyApi";
import {
  describeActivity,
  formatEventTime,
  formatEventTimeFull,
  type HistoryProblem,
  isContributionPending,
} from "@/entities/campaign/lib/history";
import { formatEth } from "@/entities/campaign/lib/money";
import { useCampaignActivity, useCampaignDonors } from "@/entities/campaign/model/useCampaignHistory";
import { supportedChain } from "@/shared/config/web3";
import { addressHue, shortenAddress } from "@/shared/lib/address";
import { pluralize } from "@/shared/lib/plural";
import { Button } from "@/shared/ui/Button/Button";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

import styles from "./CampaignHistory.module.scss";

const explorerUrl = supportedChain.blockExplorers.default.url;
const blockFormat = new Intl.NumberFormat("ru-RU");

// Цвет точки события: деньги пришли, ушли обратно, выведены или сбор закрыт.
const activityTones: Record<ActivityType, string> = {
  created: styles.toneNeutral,
  deadline_updated: styles.toneNeutral,
  donation: styles.toneIn,
  refund: styles.toneBack,
  cancelled: styles.toneMuted,
  withdrawn: styles.toneOut,
};

const problemMessages: Record<HistoryProblem, string> = {
  "not-indexed": "Кампания создана недавно: история появится, когда её блок станет финальным — обычно до 15 минут.",
  unavailable: "Сервер истории не ответил. Сбор и средства не пострадали: суммы на странице читаются из контракта.",
};

type CampaignHistoryProps = {
  id: bigint;
  account: Address | undefined;
  // Вклад посетителя по контракту: с ним сверяется история, чтобы предупредить об отставании.
  contribution: bigint | undefined;
};

// История кампании из indexer: участники и лента событий. Дополняет страницу, а не заменяет контракт.
export function CampaignHistory({ id, account, contribution }: CampaignHistoryProps) {
  const donors = useCampaignDonors(id);
  const activity = useCampaignActivity(id);
  // Одна подпись о свежести на оба блока: они читаются из одних таблиц indexer.
  const block = activity.finalizedBlock ?? donors.finalizedBlock;

  return (
    <>
      <CampaignDonors account={account} contribution={contribution} donors={donors} />
      <CampaignActivity account={account} activity={activity} block={block} />
    </>
  );
}

const isOwn = (address: string | null, account: Address | undefined) =>
  account !== undefined && address !== null && address.toLowerCase() === account.toLowerCase();

function CampaignDonors({
  account,
  contribution,
  donors,
}: Omit<CampaignHistoryProps, "id"> & { donors: ReturnType<typeof useCampaignDonors> }) {
  const own = donors.donors.find((item) => isOwn(item.donor, account));
  const pending = isContributionPending({
    onChain: account === undefined ? undefined : contribution,
    listed: own?.amount,
    listComplete: donors.isComplete,
  });

  return (
    <section aria-busy={donors.isPending} aria-labelledby="donors-title" className={styles.section}>
      <h2 className={styles.heading} id="donors-title">
        Участники
        {donors.total !== undefined && donors.total > 0 ? <span className={styles.count}>{donors.total}</span> : null}
      </h2>

      <HistoryBody problem={donors.problem} isPending={donors.isPending} retry={donors.retry}>
        {pending ? (
          <p className={styles.pending}>
            Ваш вклад по контракту — {formatEth(contribution ?? 0n)}. В истории он появится, когда блок станет финальным, обычно до
            15 минут.
          </p>
        ) : null}

        {donors.donors.length === 0 ? (
          <p className={styles.empty}>Пока никто не поддержал сбор.</p>
        ) : (
          <ol className={styles.donors}>
            {donors.donors.map((item, index) => (
              <DonorRow donor={item} isOwn={isOwn(item.donor, account)} key={item.donor} place={index + 1} />
            ))}
          </ol>
        )}

        <MoreButton
          failed={donors.loadMoreFailed}
          hasMore={donors.hasMore}
          isLoading={donors.isLoadingMore}
          label="Показать ещё участников"
          loadMore={donors.loadMore}
        />
      </HistoryBody>
    </section>
  );
}

function DonorRow({ donor, isOwn: own, place }: { donor: Donor; isOwn: boolean; place: number }) {
  // История нужна, только если она отличается от текущего вклада: возвраты или несколько вкладов.
  const hasHistory = donor.refunded > 0n || donor.donations > 1;

  return (
    <li className={[styles.donor, own ? styles.own : undefined].filter(Boolean).join(" ")}>
      <span aria-hidden="true" className={styles.place}>
        {place}
      </span>
      <Actor address={donor.donor} isOwn={own} />
      <span className={styles.donorAmount}>
        <strong>{formatEth(donor.amount)}</strong>
        {hasHistory ? (
          <span className={styles.donorHistory}>
            {donor.donations} {pluralize(donor.donations, ["вклад", "вклада", "вкладов"])}
            {donor.refunded > 0n ? ` · возвращено ${formatEth(donor.refunded)}` : null}
          </span>
        ) : null}
      </span>
    </li>
  );
}

function CampaignActivity({
  account,
  activity,
  block,
}: {
  account: Address | undefined;
  activity: ReturnType<typeof useCampaignActivity>;
  block: bigint | null;
}) {

  return (
    <section aria-busy={activity.isPending} aria-labelledby="activity-title" className={styles.section}>
      <h2 className={styles.heading} id="activity-title">
        Активность
      </h2>

      <HistoryBody problem={activity.problem} isPending={activity.isPending} retry={activity.retry}>
        <ol className={styles.feed}>
          {activity.items.map((item) => (
            <ActivityRow isOwn={isOwn(item.actor, account)} item={item} key={`${item.txHash}-${item.logIndex}`} />
          ))}
        </ol>

        <MoreButton
          failed={activity.loadMoreFailed}
          hasMore={activity.hasMore}
          isLoading={activity.isLoadingMore}
          label="Показать более ранние события"
          loadMore={activity.loadMore}
        />
      </HistoryBody>

      {block === null ? null : (
        <p className={styles.freshness}>
          Участники и активность — на блоке {blockFormat.format(block)} · история отстаёт от сети до 15 минут
        </p>
      )}
    </section>
  );
}

function ActivityRow({ item, isOwn: own }: { item: ActivityItem; isOwn: boolean }) {
  return (
    <li className={[styles.event, activityTones[item.type]].join(" ")}>
      <p className={styles.eventText}>
        {item.actor === null ? <span>Контракт</span> : <Actor address={item.actor} isOwn={own} />}{" "}
        <span>{describeActivity(item)}</span>
      </p>
      <p className={styles.eventMeta}>
        {item.blockTimestamp === null ? (
          <span>блок {blockFormat.format(item.blockNumber)}</span>
        ) : (
          <time dateTime={item.blockTimestamp.toISOString()} title={formatEventTimeFull(item.blockTimestamp)}>
            {formatEventTime(item.blockTimestamp)}
          </time>
        )}
        <span aria-hidden="true">·</span>
        <a href={`${explorerUrl}/tx/${item.txHash}`} rel="noreferrer" target="_blank">
          Транзакция <span aria-hidden="true">↗</span>
        </a>
      </p>
    </li>
  );
}

function Actor({ address, isOwn: own }: { address: Address; isOwn: boolean }) {
  return (
    <span className={styles.actor}>
      <span
        aria-hidden="true"
        className={styles.avatar}
        style={{ "--avatar-hue": addressHue(address) } as CSSProperties}
      />
      <a className={styles.address} href={`${explorerUrl}/address/${address}`} rel="noreferrer" target="_blank" title={address}>
        {shortenAddress(address)}
      </a>
      {own ? <span className={styles.you}>вы</span> : null}
    </span>
  );
}

// Состояния блока истории: загрузка, ошибка с повтором или содержимое.
function HistoryBody({
  children,
  isPending,
  problem,
  retry,
}: {
  children: ReactNode;
  isPending: boolean;
  problem: HistoryProblem | null;
  retry: () => unknown;
}) {
  if (problem) {
    return (
      <div className={styles.problem} role="status">
        <p>{problemMessages[problem]}</p>
        <Button onClick={() => void retry()} size="compact" variant="secondary">
          Повторить
        </Button>
      </div>
    );
  }
  if (isPending) {
    return (
      <div className={styles.loading}>
        <Skeleton label="Загрузка истории" />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }
  return children;
}

function MoreButton({
  failed,
  hasMore,
  isLoading,
  label,
  loadMore,
}: {
  failed: boolean;
  hasMore: boolean;
  isLoading: boolean;
  label: string;
  loadMore: () => unknown;
}) {
  if (!hasMore) return null;
  return (
    <div className={styles.more}>
      <Button isLoading={isLoading} onClick={() => void loadMore()} size="compact" variant="secondary">
        {failed ? "Не загрузилось — повторить" : label}
      </Button>
    </div>
  );
}
