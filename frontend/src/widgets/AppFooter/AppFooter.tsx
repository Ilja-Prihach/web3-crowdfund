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
        <Link className={styles.brand} href="/" aria-label="OpenFund — на главную">
          <BrandMark className={styles.brandMark} />
          <span>
            Open<em>Fund</em>
          </span>
        </Link>

        <p className={styles.notice}>Тестовая сеть Sepolia: ETH здесь не имеет реальной стоимости</p>

        <nav aria-label="Дополнительная навигация" className={styles.links}>
          <a
            aria-label="Контракт V2 в Sepolia — откроется в новой вкладке"
            href={contractUrl}
            rel="noreferrer"
            target="_blank"
          >
            Контракт V2 <span aria-hidden="true">↗</span>
          </a>
          <a
            aria-label="Исходный код OpenFund — откроется в новой вкладке"
            href={sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Исходный код <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>
    </footer>
  );
}
