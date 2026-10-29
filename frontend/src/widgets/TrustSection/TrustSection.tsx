import { ButtonLink } from "@/shared/ui/Button/ButtonLink";
import { SectionHeader } from "@/shared/ui/SectionHeader/SectionHeader";

import styles from "./TrustSection.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";

const guarantees = [
  "Учёт цели, режима, срока и собранной суммы",
  "Возврат вклада по правилам режима",
  "Вывод автором только после достижения цели",
  "Публичные события каждого перевода",
];

const limitations = [
  "Что автор завершит заявленный проект",
  "Что результат окажется качественным",
  "Что описание подтверждает личность автора",
  "Выполнение договорённостей вне блокчейна",
];

export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" id="trust">
      <div className={styles.inner}>
        <SectionHeader
          eyebrow="Граница доверия"
          title="Код отвечает за деньги, но не за обещания"
          titleId="trust-title"
        />

        <div className={styles.cards}>
          <article className={styles.guarantees}>
            <h3 className={styles.cardTitle}>Контракт гарантирует</h3>
            <ul className={styles.list}>
              {guarantees.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className={styles.verified}>
              <p>
                <strong>Контракт V2</strong> верифицирован в Sepolia
              </p>
              <ButtonLink
                aria-label="Проверить контракт V2 в Etherscan — откроется в новой вкладке"
                href={contractUrl}
                rel="noreferrer"
                size="compact"
                target="_blank"
                variant="secondary"
              >
                Etherscan <span aria-hidden="true">↗</span>
              </ButtonLink>
            </div>
          </article>

          <article className={styles.limitations}>
            <h3 className={styles.cardTitle}>Контракт не гарантирует</h3>
            <ul className={styles.list}>
              {limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
