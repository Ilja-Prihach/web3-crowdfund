"use client";

import { useRef, useState } from "react";

import { CampaignCard } from "@/entities/campaign/CampaignCard/CampaignCard";
import type { CatalogOrder } from "@/entities/campaign/lib/pagination";
import type { FundingMode } from "@/entities/campaign/model/campaign";
import { useCampaignCatalog } from "@/entities/campaign/model/useCampaignCatalog";
import { pluralize } from "@/shared/lib/plural";
import { Button } from "@/shared/ui/Button/Button";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Select } from "@/shared/ui/Select/Select";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

import styles from "./CampaignCatalog.module.scss";

type StatusFilter = "all" | "active" | "finished";
type ModeFilter = "all" | FundingMode;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "Идёт сбор" },
  { value: "finished", label: "Завершены" },
];

const modeFilters: { value: ModeFilter; label: string }[] = [
  { value: "all", label: "Любой тип" },
  { value: "fixedDeadline", label: "К сроку" },
  { value: "openEnded", label: "Без срока" },
];

const orderOptions: { value: CatalogOrder; label: string }[] = [
  { value: "newest", label: "Сначала новые" },
  { value: "oldest", label: "Сначала старые" },
];

export function CampaignCatalog() {
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<CatalogOrder>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  // Время фиксируется при открытии страницы: «осталось 4 дня» не должно прыгать при каждом рендере.
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const sectionRef = useRef<HTMLElement>(null);

  const catalog = useCampaignCatalog(page, order);

  // Фильтры работают только по загруженной странице: без индексатора глобального поиска нет.
  const visibleCampaigns = catalog.campaigns.filter(
    (campaign) =>
      (statusFilter === "all" ||
        (statusFilter === "active" ? campaign.status === "active" : campaign.status !== "active")) &&
      (modeFilter === "all" || campaign.fundingMode === modeFilter),
  );

  const resetFilters = () => {
    setStatusFilter("all");
    setModeFilter("all");
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    sectionRef.current?.scrollIntoView({ block: "start" });
  };

  const total = catalog.total === undefined ? undefined : Number(catalog.total);
  const hasCampaigns = catalog.campaigns.length > 0;
  const filtersActive = statusFilter !== "all" || modeFilter !== "all";

  return (
    <section aria-labelledby="catalog-title" className={styles.catalog} ref={sectionRef}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Открытое финансирование</span>
        <h1 className={styles.title} id="catalog-title">
          Кампании
        </h1>
        <p className={styles.lead}>
          Выбирайте независимые проекты и общественные инициативы. Цель, прогресс и условия каждого сбора
          доступны on-chain, а правила вывода и возврата исполняет контракт.
        </p>
        <p className={styles.summary}>
          {total === undefined
            ? catalog.isError
              ? "Контракт V2 · Ethereum Sepolia"
              : "Загружаем кампании…"
            : `${total} ${pluralize(total, ["сбор", "сбора", "сборов"])} в контракте V2 · Ethereum Sepolia`}
        </p>
      </header>

      {hasCampaigns ? (
        <div className={styles.toolbar}>
          <div aria-label="Состояние кампании" className={styles.statusTabs} role="group">
            {statusFilters.map((filter) => (
              <button
                aria-pressed={statusFilter === filter.value}
                className={styles.statusTab}
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className={styles.filterControls}>
            <Select
              ariaLabel="Тип сбора"
              className={styles.filterSelect}
              onChange={setModeFilter}
              options={modeFilters}
              value={modeFilter}
            />
            <Select
              ariaLabel="Сортировка"
              className={styles.filterSelect}
              onChange={(nextOrder) => {
                setOrder(nextOrder);
                setPage(0);
              }}
              options={orderOptions}
              value={order}
            />
            {filtersActive ? (
              <button className={styles.reset} onClick={resetFilters} type="button">
                Сбросить
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {catalog.isError ? (
        <ErrorState
          action={
            <Button onClick={() => catalog.retry()} variant="secondary">
              Повторить
            </Button>
          }
          description="RPC-узел Sepolia не ответил. Кампании и средства не пострадали: они хранятся в контракте."
          title="Не удалось прочитать каталог"
        />
      ) : catalog.isPending ? (
        <div aria-busy="true" className={styles.grid}>
          {[0, 1, 2].map((index) => (
            <div className={styles.skeletonCard} key={index}>
              <Skeleton label="Загрузка кампании" variant="panel" />
              <div className={styles.skeletonBody}>
                <Skeleton variant="title" />
                <Skeleton />
                <Skeleton />
              </div>
            </div>
          ))}
        </div>
      ) : !hasCampaigns ? (
        <EmptyState
          description="В контракте V2 ещё не создано ни одного сбора. Как только кто-то создаст кампанию, она появится здесь."
          title="Кампаний пока нет"
        />
      ) : visibleCampaigns.length === 0 ? (
        <div className={styles.filteredEmpty}>
          <p>На этой странице нет кампаний с такими фильтрами.</p>
          <Button onClick={resetFilters} size="compact" variant="secondary">
            Сбросить фильтры
          </Button>
        </div>
      ) : (
        <ul className={styles.grid}>
          {visibleCampaigns.map((campaign) => (
            <li key={campaign.id.toString()}>
              <CampaignCard campaign={campaign} nowSeconds={nowSeconds} />
            </li>
          ))}
        </ul>
      )}

      {catalog.pageCount > 1 ? (
        <nav aria-label="Страницы каталога" className={styles.pager}>
          <Button disabled={page === 0} onClick={() => goToPage(page - 1)} size="compact" variant="secondary">
            <span aria-hidden="true">←</span> Назад
          </Button>
          <span>
            Страница {page + 1} из {catalog.pageCount}
          </span>
          <Button
            disabled={page >= catalog.pageCount - 1}
            onClick={() => goToPage(page + 1)}
            size="compact"
            variant="secondary"
          >
            Дальше <span aria-hidden="true">→</span>
          </Button>
        </nav>
      ) : null}
    </section>
  );
}
