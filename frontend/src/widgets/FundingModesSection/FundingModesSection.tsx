import { SectionHeader } from "@/shared/ui/SectionHeader/SectionHeader";

import styles from "./FundingModesSection.module.scss";

const modes = [
  {
    code: "FixedDeadline",
    tag: "Есть срок",
    title: "Собрать к дате",
    summary: "Для проектов, которым нужна конкретная сумма до начала работ или события.",
    endLabel: "Дедлайн",
    rules: [
      { term: "Срок", value: "1–365 дней" },
      { term: "Успех", value: "Сразу при достижении цели" },
      { term: "Возврат", value: "Если срок прошёл или сбор отменён" },
    ],
  },
  {
    code: "OpenEnded",
    tag: "Без срока",
    title: "Идти к цели без дедлайна",
    summary: "Для долгих инициатив, где важна сумма, а искусственная дата не нужна.",
    endLabel: "∞",
    rules: [
      { term: "Срок", value: "Нет" },
      { term: "Успех", value: "Сразу при достижении цели" },
      { term: "Возврат", value: "В любой момент до достижения цели" },
    ],
  },
];

export function FundingModesSection() {
  return (
    <section aria-labelledby="funding-modes-title" id="funding-modes">
      <div className={styles.inner}>
        <SectionHeader
          aside="Режим фиксируется при запуске и определяет срок и право на возврат."
          eyebrow="Два режима"
          title="Выберите сценарий сбора"
          titleId="funding-modes-title"
        />

        <div className={styles.modes}>
          {modes.map((mode) => (
            <article className={styles.mode} key={mode.code}>
              <div className={styles.top}>
                <p className={styles.tag}>{mode.tag}</p>
                <p className={styles.code}>{mode.code}</p>
              </div>

              <div className={styles.intro}>
                <h3 className={styles.title}>{mode.title}</h3>
                <p className={styles.summary}>{mode.summary}</p>
              </div>

              <div aria-hidden="true" className={styles.timeline}>
                <span className={styles.track} />
                <span className={styles.fill} />
                <span className={styles.startTick} />
                <span className={styles.endTick} />
                <span className={styles.startLabel}>Старт</span>
                <span className={styles.endLabel}>{mode.endLabel}</span>
              </div>

              <dl className={styles.rules}>
                {mode.rules.map((rule) => (
                  <div key={rule.term}>
                    <dt>{rule.term}</dt>
                    <dd>{rule.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
