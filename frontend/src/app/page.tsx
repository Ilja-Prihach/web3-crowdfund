import { Button } from "@/shared/ui/Button/Button";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Field } from "@/shared/ui/Field/Field";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

import styles from "./page.module.scss";

export default function HomePage() {
  return (
    <main className={styles.main} id="main-content" tabIndex={-1}>
      <section className={styles.intro} aria-labelledby="foundation-title">
        <p className={styles.kicker}>OpenFund · дизайн-система / PR 02</p>
        <h1 className={styles.title} id="foundation-title">
          Открытый реестр интерфейса
        </h1>
        <p className={styles.lead}>
          Техническая витрина визуальной основы продукта: редакционная типографика для
          объяснений и точные FinTech-компоненты для будущих on-chain-действий.
        </p>

        <dl className={styles.register}>
          <div className={styles.registerItem}>
            <dt>Сеть</dt>
            <dd>Sepolia</dd>
          </div>
          <div className={styles.registerItem}>
            <dt>Язык</dt>
            <dd>Русский</dd>
          </div>
          <div className={styles.registerItem}>
            <dt>Источник истины</dt>
            <dd>Контракт V2</dd>
          </div>
          <div className={styles.registerItem}>
            <dt>Статус</dt>
            <dd>Основа интерфейса</dd>
          </div>
        </dl>
      </section>

      <section className={styles.preview} aria-labelledby="preview-title">
        <header className={styles.previewHeader}>
          <p className={styles.sectionLabel}>Компоненты</p>
          <h2 className={styles.previewTitle} id="preview-title">
            Состояния без имитации функций
          </h2>
          <p className={styles.previewDescription}>
            Это демонстрационный экран для визуальной и accessibility-проверки. Кошелёк,
            кампании и транзакции будут подключены в следующих этапах.
          </p>
        </header>

        <div className={styles.samples}>
          <div className={styles.sample}>
            <p className={styles.sampleLabel}>Поле и действия</p>
            <Field
              hint="Демонстрационное поле: транзакция не отправляется."
              id="demo-amount"
              inputMode="decimal"
              label="Сумма поддержки, ETH"
              placeholder="0,05"
            />
            <div className={styles.buttonRow}>
              <Button>Основное действие</Button>
              <Button variant="secondary">Вторичное</Button>
              <Button disabled variant="quiet">
                Недоступно
              </Button>
            </div>
          </div>

          <div className={styles.loadingSample}>
            <p className={styles.sampleLabel}>Загрузка</p>
            <Skeleton variant="title" />
            <div className={styles.loadingLines}>
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
            <Skeleton variant="control" />
          </div>
        </div>

        <div className={styles.stateSamples}>
          <EmptyState
            description="Компонент объясняет отсутствие данных и не выдаёт его за ошибку."
            title="Здесь пока нет кампаний"
          />
          <ErrorState
            action={<Button variant="secondary">Повторить запрос</Button>}
            description="Причина будет локализована, а повторное действие останется явным."
            title="Данные временно недоступны"
          />
        </div>
      </section>
    </main>
  );
}
