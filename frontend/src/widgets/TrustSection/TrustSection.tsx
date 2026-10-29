import styles from "./TrustSection.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";

export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" className={styles.section} id="trust">
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.index}>2 / Граница доверия</p>
          <h2 className={styles.title} id="trust-title">
            Контракт держит деньги. Обещание остаётся человеческим.
          </h2>
        </header>

        <div className={styles.boundaries}>
          <article className={styles.guarantees}>
            <p className={styles.label}>Что обеспечивает код</p>
            <ul>
              <li>учёт цели, режима, дедлайна и текущей суммы;</li>
              <li>право возврата по правилам выбранного режима;</li>
              <li>вывод создателем только после достижения цели;</li>
              <li>публичные события финансовых переходов.</li>
            </ul>
          </article>

          <article className={styles.limitations}>
            <p className={styles.label}>Чего код не обещает</p>
            <ul>
              <li>что автор завершит заявленный проект;</li>
              <li>что результат будет качественным или полезным;</li>
              <li>что описание подтверждает личность создателя;</li>
              <li>что off-chain-договорённости будут выполнены.</li>
            </ul>
          </article>
        </div>

        <aside className={styles.verification}>
          <div>
            <p className={styles.verificationLabel}>Проверяемая основа</p>
            <p className={styles.verificationText}>
              V2-контракт развёрнут и верифицирован в тестовой сети Ethereum Sepolia.
            </p>
          </div>
          <a
            aria-label="Проверить контракт V2 в Etherscan — откроется в новой вкладке"
            className={styles.contractLink}
            href={contractUrl}
            rel="noreferrer"
            target="_blank"
          >
            Открыть Etherscan <span aria-hidden="true">↗</span>
          </a>
        </aside>
      </div>
    </section>
  );
}
