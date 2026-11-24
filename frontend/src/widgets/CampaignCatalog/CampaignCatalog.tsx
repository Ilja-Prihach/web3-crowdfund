"use client";

import { useRef, useState } from "react";

import { CampaignCard } from "@/entities/campaign/CampaignCard/CampaignCard";
import type { CatalogSort } from "@/entities/campaign/api/catalogApi";
import {
  type CatalogFilters,
  type CategoryFilter,
  defaultCatalogFilters,
  type ModeFilter,
  type StatusFilter,
} from "@/entities/campaign/lib/catalogFilters";
import { campaignCategories, campaignCategoryLabels } from "@/entities/campaign/model/campaign";
import { useCatalog } from "@/entities/campaign/model/useCatalog";
import { pluralize } from "@/shared/lib/plural";
import { useDebouncedValue } from "@/shared/lib/useDebouncedValue";
import { Button } from "@/shared/ui/Button/Button";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Select } from "@/shared/ui/Select/Select";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

import styles from "./CampaignCatalog.module.scss";

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

const categoryFilters: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "Все категории" },
  ...campaignCategories.map((category) => ({ value: category, label: campaignCategoryLabels[category] })),
];

const sortOptions: { value: CatalogSort; label: string }[] = [
  { value: "newest", label: "Сначала новые" },
  { value: "oldest", label: "Сначала старые" },
  { value: "raised", label: "Больше собрано" },
];

// У контракта нет сортировки по сумме: без backend этот пункт не предлагается.
const contractSortOptions = sortOptions.filter((option) => option.value !== "raised");

const searchDelayMs = 300;
const blockFormat = new Intl.NumberFormat("ru-RU");

export function CampaignCatalog() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<CatalogFilters>(defaultCatalogFilters);
  // Время фиксируется при открытии страницы: «осталось 4 дня» не должно прыгать при каждом рендере.
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const sectionRef = useRef<HTMLElement>(null);

  // В запрос уходит поиск после паузы в наборе, остальные фильтры — сразу.
  const query = useDebouncedValue(filters.query, searchDelayMs);
  const catalog = useCatalog({ ...filters, query }, page);
  const fromBackend = catalog.source === "backend";
  const searching = query.trim() !== "";

  // Любой новый фильтр — снова первая страница: прошлая могла кончиться раньше.
  const updateFilters = (changes: Partial<CatalogFilters>) => {
    setFilters((current) => ({ ...current, ...changes }));
    setPage(0);
  };

  const resetFilters = () => updateFilters(defaultCatalogFilters);

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    sectionRef.current?.scrollIntoView({ block: "start" });
  };

  const total = catalog.total;
  const filtersActive =
    filters.query.trim() !== "" || filters.status !== "all" || filters.mode !== "all" || filters.category !== "all";
  const hasCampaigns = catalog.campaigns.length > 0;
  // Панель фильтров нужна, если есть что фильтровать или фильтр уже что-то скрыл.
  const showToolbar = (total !== undefined && total > 0) || filtersActive;

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
              ? process.env.NEXT_PUBLIC_OPENFUND_DEMO === "1" ? "Контракт V2 · локальная демосеть" : "Контракт V2 · Ethereum Sepolia"
              : "Загружаем кампании…"
            : fromBackend && filtersActive
              ? `Найдено: ${total} ${pluralize(total, ["сбор", "сбора", "сборов"])}`
              : `${total} ${pluralize(total, ["сбор", "сбора", "сборов"])} в контракте V2 · ${process.env.NEXT_PUBLIC_OPENFUND_DEMO === "1" ? "локальная демосеть" : "Ethereum Sepolia"}`}
        </p>
        {/* Каталог backend отстаёт до finalized-блока: говорим об этом, а суммы на странице кампании — из контракта. */}
        {fromBackend && catalog.finalizedBlock !== null ? (
          <p className={styles.freshness}>
            Каталог обновляется с задержкой до 15 минут · данные на блоке{" "}
            {blockFormat.format(catalog.finalizedBlock)}
          </p>
        ) : null}
      </header>

      {showToolbar ? (
        <div className={styles.toolbar}>
          <label className={styles.search}>
            <span aria-hidden="true" className={styles.searchIcon}>
              ⌕
            </span>
            <input
              aria-label="Поиск кампаний"
              className={styles.searchInput}
              disabled={catalog.source === "contract"}
              maxLength={100}
              onChange={(event) => updateFilters({ query: event.target.value })}
              placeholder="Поиск по названию или описанию"
              type="search"
              value={filters.query}
            />
          </label>

          <div className={styles.filterRow}>
            <div aria-label="Состояние кампании" className={styles.statusTabs} role="group">
              {statusFilters.map((filter) => (
                <button
                  aria-pressed={filters.status === filter.value}
                  className={styles.statusTab}
                  key={filter.value}
                  onClick={() => updateFilters({ status: filter.value })}
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className={styles.filterControls}>
              {/* Категории знает только backend: при откате на контракт фильтр не предлагается, как «Больше собрано». */}
              {fromBackend ? (
                <Select
                  ariaLabel="Категория"
                  className={[styles.filterSelect, styles.categorySelect].join(" ")}
                  onChange={(category) => updateFilters({ category })}
                  options={categoryFilters}
                  value={filters.category}
                />
              ) : null}
              <Select
                ariaLabel="Тип сбора"
                className={styles.filterSelect}
                onChange={(mode) => updateFilters({ mode })}
                options={modeFilters}
                value={filters.mode}
              />
              <Select
                ariaLabel="Сортировка"
                className={styles.filterSelect}
                onChange={(sort) => updateFilters({ sort })}
                options={fromBackend ? sortOptions : contractSortOptions}
                value={filters.sort}
              />
              {filtersActive ? (
                <button className={styles.reset} onClick={resetFilters} type="button">
                  Сбросить
                </button>
              ) : null}
            </div>
          </div>

          {catalog.source === "contract" && !catalog.isError ? (
            <div className={styles.fallback} role="status">
              <p>
                Поиск, категории и сортировка по сумме временно недоступны: показываем кампании напрямую из контракта.
                {catalog.pageCount > 1 ? " Фильтры применяются к этой странице." : null}
              </p>
              <button className={styles.reset} onClick={() => void catalog.retryBackend()} type="button">
                Повторить поиск
              </button>
            </div>
          ) : null}
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
      ) : !hasCampaigns && filtersActive ? (
        <div className={styles.filteredEmpty}>
          <p>
            {searching && fromBackend
              ? `По запросу «${query.trim()}» ничего не найдено.`
              : fromBackend
                ? "Нет кампаний с такими фильтрами."
                : "На этой странице нет кампаний с такими фильтрами."}
          </p>
          <Button onClick={resetFilters} size="compact" variant="secondary">
            Сбросить фильтры
          </Button>
        </div>
      ) : !hasCampaigns ? (
        <EmptyState
          description="В контракте V2 ещё не создано ни одного сбора. Как только кто-то создаст кампанию, она появится здесь."
          title="Кампаний пока нет"
        />
      ) : (
        <ul aria-busy={catalog.isUpdating || undefined} className={[styles.grid, catalog.isUpdating ? styles.updating : undefined].filter(Boolean).join(" ")}>
          {catalog.campaigns.map((campaign) => (
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
