import Image from "next/image";

import { SectionHeader } from "@/shared/ui/SectionHeader/SectionHeader";

import outcomeImage from "./assets/outcome.webp";
import rulesImage from "./assets/rules.webp";
import transferImage from "./assets/transfer.webp";
import styles from "./HowItWorksSection.module.scss";

const steps = [
  {
    title: "Автор задаёт правила",
    text: "Цель в ETH, режим и срок записываются в контракт при создании сбора.",
    image: rulesImage,
  },
  {
    title: "Участник переводит ETH",
    text: "Вклад уходит из кошелька прямо в контракт. Сумма и адрес публичны.",
    image: transferImage,
  },
  {
    title: "Контракт определяет исход",
    text: "Успех — автор выводит средства. Провал или отмена — участники забирают вклады.",
    image: outcomeImage,
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
                <Image
                  alt=""
                  className={styles.stepArt}
                  fill
                  placeholder="blur"
                  sizes="(max-width: 959px) calc(100vw - 3.75rem), (max-width: 1440px) 30vw, 430px"
                  src={step.image}
                />
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
