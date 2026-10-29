import Link from "next/link";

import { BrandMark } from "@/shared/ui/BrandMark/BrandMark";

import styles from "./AppFooter.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";
const sourceUrl = "https://github.com/Ilja-Prihach/web3-crowdfund";

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.intro}>
            <Link className={styles.brand} href="/" aria-label="OpenFund — на главную">
              <BrandMark className={styles.brandMark} tone="dark" />
              <span>
                Open<em>Fund</em>
              </span>
            </Link>
            <p>
              Учебная on-chain-платформа для прозрачного финансирования независимых
              проектов.
            </p>
            <p className={styles.disclaimer}>
              Контракт контролирует движение ETH, но не подтверждает выполнение обещаний
              создателем.
            </p>
          </div>

          <nav aria-label="Дополнительная навигация" className={styles.columns}>
            <div>
              <p className={styles.columnTitle}>Продукт</p>
              <ul>
                <li>
                  <Link href="/#how-it-works">Как работает</Link>
                </li>
                <li>
                  <Link href="/#funding-modes">Режимы</Link>
                </li>
                <li>
                  <Link href="/#trust">Безопасность</Link>
                </li>
              </ul>
            </div>
            <div>
              <p className={styles.columnTitle}>Прозрачность</p>
              <ul>
                <li>
                  <a
                    aria-label="Контракт V2 в Sepolia — откроется в новой вкладке"
                    href={contractUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Контракт V2 <span aria-hidden="true">↗</span>
                  </a>
                </li>
                <li>
                  <a
                    aria-label="Исходный код OpenFund — откроется в новой вкладке"
                    href={sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Исходный код <span aria-hidden="true">↗</span>
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p>Ethereum Sepolia · портфолио-проект</p>
          <p>Тестовая сеть: ETH здесь не имеет реальной стоимости</p>
        </div>
      </div>
    </footer>
  );
}
