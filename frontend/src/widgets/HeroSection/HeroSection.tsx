import { ButtonLink } from "@/shared/ui/Button/ButtonLink";

import styles from "./HeroSection.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";

const proofPoints = ["Без посредника", "Возврат по правилам", "Контракт верифицирован"];

const contractRules = [
  { term: "Цель", value: "Сумма в ETH от автора" },
  { term: "Срок", value: "1–365 дней или без срока" },
  { term: "Возврат", value: "По правилам режима" },
];

const contractFacts = [
  { term: "Сеть", value: "Sepolia" },
  { term: "Адрес", value: "0x6890…077A" },
  { term: "Код", value: "Верифицирован" },
];

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>Краудфандинг в Ethereum · прототип в Sepolia</p>
          <h1 className={styles.title} id="hero-title">
            Сборы, где правила <em>исполняет код</em>
          </h1>
          <p className={styles.lead}>
            Поддерживайте проекты в ETH напрямую через смарт-контракт. Цель, срок и
            условия возврата видны до перевода — и их нельзя переписать задним числом.
          </p>

          <div className={styles.actions}>
            <ButtonLink href="#how-it-works" size="large">
              Как это работает
            </ButtonLink>
            <ButtonLink
              aria-label="Проверить контракт V2 в Etherscan — откроется в новой вкладке"
              href={contractUrl}
              rel="noreferrer"
              size="large"
              target="_blank"
              variant="secondary"
            >
              Проверить контракт <span aria-hidden="true">↗</span>
            </ButtonLink>
          </div>

          <ul className={styles.proof}>
            {proofPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <figure aria-label="Правила смарт-контракта OpenFund" className={styles.stage}>
          <div className={styles.rulesCard}>
            <div aria-hidden="true" className={styles.cover}>
              <svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 225">
                <circle cx="320" cy="40" fill="rgb(168 199 184 / 18%)" r="110" />
                <circle cx="320" cy="40" fill="rgb(168 199 184 / 22%)" r="60" />
                <path d="M0 190 Q100 140 200 175 T400 150 V225 H0Z" fill="rgb(255 253 247 / 8%)" />
                <rect
                  fill="#e45b3f"
                  height="34"
                  rx="5"
                  transform="rotate(45 61 87)"
                  width="34"
                  x="44"
                  y="70"
                />
              </svg>
              <span className={styles.coverChip}>Условия до первого вклада</span>
            </div>

            <div className={styles.rulesBody}>
              <p className={styles.rulesTitle}>Правила записаны в контракт до первого перевода</p>
              <dl className={styles.rules}>
                {contractRules.map((rule) => (
                  <div key={rule.term}>
                    <dt>{rule.term}</dt>
                    <dd>{rule.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <p className={styles.toast}>
            <span aria-hidden="true" className={styles.toastIcon}>
              ✓
            </span>
            <span>
              <strong>ETH идут в контракт</strong>
              <span className={styles.toastNote}>а не через сервер OpenFund</span>
            </span>
          </p>

          <div className={styles.contractCard}>
            <p className={styles.contractLabel}>◆ Смарт-контракт V2</p>
            <dl className={styles.contractFacts}>
              {contractFacts.map((fact) => (
                <div key={fact.term}>
                  <dt>{fact.term}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </figure>
      </div>
    </section>
  );
}
