import Link from "next/link";

import styles from "./AppHeader.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="OpenFund — на главную">
          <span aria-hidden="true" className={styles.brandMark} />
          <span>OpenFund</span>
        </Link>

        <nav aria-label="Основная навигация" className={styles.navigation}>
          <Link href="/">Обзор</Link>
          <a
            aria-label="Контракт V2 в Sepolia — откроется в новой вкладке"
            href={contractUrl}
            rel="noreferrer"
            target="_blank"
          >
            Контракт <span aria-hidden="true">↗</span>
          </a>
        </nav>

        <p className={styles.network} title="Тестовая сеть Ethereum">
          <span aria-hidden="true" className={styles.networkDot} />
          Sepolia
        </p>
      </div>
    </header>
  );
}
