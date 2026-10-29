import Image from "next/image";

import heroImage from "./assets/hero.webp";
import styles from "./HeroSection.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className={styles.hero}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <p className={styles.kicker}>OpenFund · Ethereum Sepolia</p>
          <h1 className={styles.title} id="hero-title">
            Правила сбора видны до перевода
          </h1>
          <p className={styles.lead}>
            Независимые проекты собирают ETH по условиям, записанным в контракте: к
            установленному сроку или без искусственного дедлайна.
          </p>

          <div className={styles.actions}>
            <a className={styles.primaryAction} href="#funding-modes">
              Разобраться в режимах
            </a>
            <a
              aria-label="Открыть контракт V2 в Etherscan — откроется в новой вкладке"
              className={styles.secondaryAction}
              href={contractUrl}
              rel="noreferrer"
              target="_blank"
            >
              Проверить контракт <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        <figure className={styles.visual}>
          <div className={styles.imageFrame}>
            <Image
              alt="Распределённые вычислительные узлы, соединённые линиями транзакций и слоями публичного реестра"
              className={styles.image}
              placeholder="blur"
              preload
              sizes="(max-width: 959px) calc(100vw - 2rem), (max-width: 1440px) 56vw, 780px"
              src={heroImage}
            />
          </div>
          <figcaption className={styles.caption}>
            Редакционная иллюстрация · не изображает реальную кампанию
          </figcaption>
        </figure>

        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Режимы</dt>
            <dd>К сроку / открытая цель</dd>
          </div>
          <div className={styles.fact}>
            <dt>Расчёты</dt>
            <dd>Только ETH</dd>
          </div>
          <div className={styles.fact}>
            <dt>Источник истины</dt>
            <dd>Контракт V2</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
