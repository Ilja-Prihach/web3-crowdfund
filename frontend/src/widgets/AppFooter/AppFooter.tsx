import styles from "./AppFooter.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <p className={styles.brand}>OpenFund</p>
          <p className={styles.description}>
            Учебная on-chain-платформа для прозрачного финансирования независимых проектов.
          </p>
        </div>

        <div className={styles.disclaimer}>
          <p className={styles.label}>Важно</p>
          <p>
            Контракт контролирует движение ETH, но не подтверждает выполнение обещаний создателем.
          </p>
        </div>

        <nav aria-label="Дополнительная навигация" className={styles.links}>
          <a
            aria-label="Исходный код OpenFund — откроется в новой вкладке"
            href="https://github.com/Ilja-Prihach/web3-crowdfund"
            rel="noreferrer"
            target="_blank"
          >
            Исходный код <span aria-hidden="true">↗</span>
          </a>
          <a
            aria-label="Контракт V2 в Sepolia — откроется в новой вкладке"
            href={contractUrl}
            rel="noreferrer"
            target="_blank"
          >
            V2 в Sepolia <span aria-hidden="true">↗</span>
          </a>
        </nav>

        <p className={styles.meta}>Ethereum Sepolia · портфолио-проект</p>
      </div>
    </footer>
  );
}
