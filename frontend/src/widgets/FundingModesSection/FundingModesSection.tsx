import type { ReactNode } from "react";

import { SectionHeader } from "@/shared/ui/SectionHeader/SectionHeader";

import { FixedDeadlineArt, OpenEndedArt } from "./FundingModesArt";
import styles from "./FundingModesSection.module.scss";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className={styles.icon} focusable="false" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

const ruleIcons = {
  term: (
    <Icon>
      <rect height="16" rx="2" width="18" x="3" y="5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  ),
  success: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  ),
  refund: (
    <Icon>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </Icon>
  ),
};

const modes = [
  {
    code: "FixedDeadline",
    tag: "Есть срок",
    tone: styles.fixed,
    art: <FixedDeadlineArt />,
    title: "Собрать к дате",
    summary: "Для проектов, которым нужна конкретная сумма до начала работ или события.",
    rules: [
      { icon: ruleIcons.term, term: "Срок", value: "1–365 дней" },
      { icon: ruleIcons.success, term: "Успех", value: "Сразу при достижении цели" },
      { icon: ruleIcons.refund, term: "Возврат", value: "Если срок прошёл или сбор отменён" },
    ],
  },
  {
    code: "OpenEnded",
    tag: "Без срока",
    tone: styles.open,
    art: <OpenEndedArt />,
    title: "Идти к цели без дедлайна",
    summary: "Для долгих инициатив, где важна сумма, а искусственная дата не нужна.",
    rules: [
      { icon: ruleIcons.term, term: "Срок", value: "Нет" },
      { icon: ruleIcons.success, term: "Успех", value: "Сразу при достижении цели" },
      { icon: ruleIcons.refund, term: "Возврат", value: "В любой момент до достижения цели" },
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
            <article className={`${styles.mode} ${mode.tone}`} key={mode.code}>
              <div aria-hidden="true" className={styles.head}>
                {mode.art}
              </div>

              <div className={styles.body}>
                <div className={styles.top}>
                  <p className={styles.tag}>{mode.tag}</p>
                  <p className={styles.code}>{mode.code}</p>
                </div>

                <div className={styles.intro}>
                  <h3 className={styles.title}>{mode.title}</h3>
                  <p className={styles.summary}>{mode.summary}</p>
                </div>

                <dl className={styles.rules}>
                  {mode.rules.map((rule) => (
                    <div key={rule.term}>
                      <span className={styles.ruleIcon}>{rule.icon}</span>
                      <dt>{rule.term}</dt>
                      <dd>{rule.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
