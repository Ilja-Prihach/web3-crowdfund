import type { ReactNode } from "react";

import { SectionHeader } from "@/shared/ui/SectionHeader/SectionHeader";

import { OutcomeArt, RulesArt, TransferArt } from "./HowItWorksArt";
import styles from "./HowItWorksSection.module.scss";

const steps: { title: string; text: string; art: ReactNode }[] = [
  {
    title: "Автор задаёт правила",
    text: "Цель в ETH, режим и срок записываются в контракт при создании сбора.",
    art: <RulesArt />,
  },
  {
    title: "Участник переводит ETH",
    text: "Вклад уходит из кошелька прямо в контракт. Сумма и адрес публичны.",
    art: <TransferArt />,
  },
  {
    title: "Контракт определяет исход",
    text: "Успех — автор выводит средства. Провал или отмена — участники забирают вклады.",
    art: <OutcomeArt />,
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
                <span className={styles.number}>{index + 1}</span>
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
