import type { ReactNode } from "react";

import { SectionHeader } from "@/shared/ui/SectionHeader/SectionHeader";

import styles from "./HowItWorksSection.module.scss";

const steps: { title: string; text: string; art: ReactNode }[] = [
  {
    title: "Автор задаёт правила",
    text: "Цель в ETH, режим и срок записываются в контракт при создании сбора.",
    art: (
      <div className={styles.formArt}>
        <i className={styles.lineShort} />
        <i />
        <div className={styles.segments}>
          <i className={styles.segmentActive} />
          <i />
        </div>
        <i className={styles.lineTiny} />
        <i className={styles.submit} />
      </div>
    ),
  },
  {
    title: "Участник переводит ETH",
    text: "Вклад уходит из кошелька прямо в контракт. Сумма и адрес публичны.",
    art: (
      <div className={styles.walletArt}>
        <div className={styles.wallet}>
          <span>Кошелёк</span>
          <b>ETH</b>
        </div>
        <span className={styles.arrow}>→</span>
        <div className={styles.contract} />
      </div>
    ),
  },
  {
    title: "Контракт определяет исход",
    text: "Успех — автор выводит средства. Провал или отмена — участники забирают вклады.",
    art: (
      <div className={styles.outcomeArt}>
        <p className={styles.success}>
          <span>Цель достигнута</span>
          <span>→ автору</span>
        </p>
        <p className={styles.failure}>
          <span>Сбор провален</span>
          <span>→ участникам</span>
        </p>
      </div>
    ),
  },
];

export function HowItWorksSection() {
  return (
    <section aria-labelledby="how-it-works-title" id="how-it-works">
      <div className={styles.inner}>
        <SectionHeader
          aside="OpenFund не принимает ETH на свой счёт и не решает исход вручную. Всё делает контракт."
          eyebrow="Как это работает"
          title="Три шага — и деньги движутся только по правилам"
          titleId="how-it-works-title"
        />

        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li className={styles.step} key={step.title}>
              <div aria-hidden="true" className={styles.art}>
                {step.art}
              </div>
              <div className={styles.text}>
                <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
