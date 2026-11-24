"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchHomeOverview } from "@/entities/campaign/api/homeOverviewApi";
import { CampaignCard } from "@/entities/campaign/CampaignCard/CampaignCard";
import { formatEth } from "@/entities/campaign/lib/money";
import { Button } from "@/shared/ui/Button/Button";
import { ButtonLink } from "@/shared/ui/Button/ButtonLink";
import { SectionHeader } from "@/shared/ui/SectionHeader/SectionHeader";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

import styles from "./HomeOverview.module.scss";

const numberFormat = new Intl.NumberFormat("ru-RU");

export function HomeOverview() {
  const query = useQuery({
    queryKey: ["home-overview"],
    queryFn: ({ signal }) => fetchHomeOverview(signal),
    retry: false,
    staleTime: 60_000,
  });
  const overview = query.data;
  const nowSeconds = query.dataUpdatedAt / 1000;

  return (
    <div className={styles.inner}>
      {overview ? (
        <section aria-label="OpenFund в цифрах" className={styles.stats}>
          <dl className={styles.metrics}>
            <div><dt>Запущено кампаний</dt><dd>{numberFormat.format(overview.launched)}</dd></div>
            <div><dt>Всего внесено, включая возвращённые вклады</dt><dd>{formatEth(overview.donatedWei)}</dd></div>
            <div><dt>Кошельков поддержали проекты</dt><dd>{numberFormat.format(overview.donors)}</dd></div>
            <div><dt>Кампаний достигли цели</dt><dd>{numberFormat.format(overview.reachedGoal)}</dd></div>
          </dl>
          <p className={styles.source}>
            {process.env.NEXT_PUBLIC_OPENFUND_DEMO === "1" ? "Локальная демосеть" : "Sepolia"} · данные на блоке {numberFormat.format(overview.finalizedBlock)}. Новые события появляются после финализации и обработки индексатором.
          </p>
        </section>
      ) : query.isPending ? <Skeleton variant="panel" /> : null}

      <section aria-labelledby="home-campaigns-title" className={styles.projects}>
        <SectionHeader
          aside={<ButtonLink href="/campaigns" variant="secondary">Все кампании <span aria-hidden="true">→</span></ButtonLink>}
          eyebrow="Сейчас собирают"
          title="Проекты, которым нужна поддержка"
          titleId="home-campaigns-title"
        />
        {query.isError ? (
          <div className={styles.notice} role="status">
            <p>{overview ? "Не удалось обновить данные. Показан последний полученный снимок." : "Статистика и подборка временно недоступны."}</p>
            <Button onClick={() => void query.refetch()} isLoading={query.isFetching} variant="quiet">Повторить</Button>
          </div>
        ) : null}
        {query.isPending ? (
          <div className={styles.grid} aria-label="Загрузка кампаний">
            {[1, 2, 3].map((id) => <Skeleton key={id} variant="panel" />)}
          </div>
        ) : null}
        {overview?.campaigns.length ? (
          <div className={styles.grid}>
            {overview.campaigns.map((campaign) => <CampaignCard key={campaign.id.toString()} campaign={campaign} nowSeconds={nowSeconds} />)}
          </div>
        ) : null}
        {overview?.campaigns.length === 0 ? <p className={styles.notice}>Сейчас нет активных сборов.</p> : null}
        {overview === null && !query.isError ? (
          <div className={styles.notice} role="status">
            <p>Статистика и подборка появятся после первой синхронизации с сетью.</p>
            <Button onClick={() => void query.refetch()} isLoading={query.isFetching} variant="quiet">Обновить</Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
