import { ButtonLink } from "@/shared/ui/Button/ButtonLink";

import { HeroArt } from "./HeroArt";
import styles from "./HeroSection.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";

const proofPoints = ["Без посредника", "Возврат по правилам", "Контракт верифицирован"];

const contractRules = [
  { term: "Цель", value: "в ETH" },
  { term: "Срок", value: "1–365 дней или ∞" },
  { term: "Возврат", value: "по режиму" },
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

        <figure aria-label="Путь ETH через смарт-контракт OpenFund" className={styles.stage}>
          <div className={styles.scene}>
            <HeroArt />
            <p className={styles.scenePill}>Смарт-контракт V2 · Sepolia</p>
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

          <div className={styles.rulesCard}>
            <p className={styles.rulesTitle}>Правила записаны до первого перевода</p>
            <dl className={styles.rules}>
              {contractRules.map((rule) => (
                <div key={rule.term}>
                  <dt>{rule.term}</dt>
                  <dd>{rule.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </figure>
      </div>
    </section>
  );
}
