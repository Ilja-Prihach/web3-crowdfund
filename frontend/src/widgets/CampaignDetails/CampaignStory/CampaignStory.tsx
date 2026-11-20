import { type CampaignDetails, hasDetailsSections } from "@/entities/campaign/api/detailsApi";
import { formatEth } from "@/entities/campaign/lib/money";

import styles from "./CampaignStory.module.scss";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" });

// Абзацы истории — по пустой строке. Только текст: React экранирует его, HTML в истории не поддерживается.
const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

type CampaignStoryProps = {
  details: CampaignDetails | undefined;
  // Цель из контракта: итог бюджета создателя с ней сверяется, но не заменяет её.
  goal: bigint;
};

// Разделы, которые создатель заполнил в backend (#49): история, бюджет, план и риски. Незаполненные не показываются.
export function CampaignStory({ details, goal }: CampaignStoryProps) {
  if (!details || !hasDetailsSections(details)) return null;
  const { story, budget, plan, risks, updatedAt } = details;
  const budgetTotal = budget?.reduce((sum, row) => sum + row.amount, 0n) ?? 0n;

  return (
    <>
      <p className={styles.offchainNote}>
        <span className={styles.offchainBadge}>Off-chain</span>
        <span>
          Разделы ниже хранит OpenFund backend, создатель может их изменить. Контракт гарантирует только цель и правила
          сбора.
          {/* Дата уже кончается на «г.»: своя точка дала бы «г..». */}
          {updatedAt ? ` Обновлено ${dateFormat.format(updatedAt)}` : null}
        </span>
      </p>

      {story ? (
        <section aria-labelledby="story-title" className={styles.section}>
          <h2 id="story-title">Подробнее о проекте</h2>
          <div className={styles.prose}>
            {paragraphs(story).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      {budget ? (
        <section aria-labelledby="budget-title" className={styles.section}>
          <h2 id="budget-title">На что пойдут средства</h2>
          <ul className={styles.budget}>
            {budget.map((row, index) => (
              <li key={index}>
                <span>{row.label}</span>
                <strong>{formatEth(row.amount)}</strong>
              </li>
            ))}
            <li className={styles.total}>
              <span>Итого</span>
              <strong>{formatEth(budgetTotal)}</strong>
            </li>
          </ul>
          {/* Бюджет — слова создателя, цель — правило контракта. Расхождение не прячем. */}
          {budgetTotal !== goal ? (
            <p className={styles.budgetNote}>Цель в контракте — {formatEth(goal)}: вывести можно только по ней.</p>
          ) : null}
        </section>
      ) : null}

      {plan ? (
        <section aria-labelledby="plan-title" className={styles.section}>
          <h2 id="plan-title">План реализации</h2>
          <ol className={styles.timeline}>
            {plan.map((step, index) => (
              <li key={index}>
                <strong>{step.period}</strong>
                <span>{step.task}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {risks ? (
        <section aria-labelledby="risks-title" className={styles.section}>
          <h2 id="risks-title">Риски и ограничения</h2>
          <div className={styles.risk}>
            <span aria-hidden="true" className={styles.riskMark}>
              !
            </span>
            <p>{risks}</p>
          </div>
        </section>
      ) : null}
    </>
  );
}
