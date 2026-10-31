import Image from "next/image";

import { contractExplorerUrl } from "@/shared/config/web3";
import { ButtonLink } from "@/shared/ui/Button/ButtonLink";

import heroArt from "./assets/hero-art.webp";
import styles from "./HeroSection.module.scss";


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
            <ButtonLink href="/campaigns" size="large">
              Смотреть кампании
            </ButtonLink>
            <ButtonLink
              aria-label="Проверить контракт V2 в Etherscan — откроется в новой вкладке"
              href={contractExplorerUrl}
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
            <Image
              alt=""
              className={styles.art}
              fill
              placeholder="blur"
              preload
              sizes="(max-width: 959px) calc(100vw - 2rem), (max-width: 1440px) 46vw, 700px"
              src={heroArt}
            />
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
