import Link from "next/link";

import { ConnectWallet } from "@/features/wallet/ui/ConnectWallet/ConnectWallet";
import { contractExplorerUrl } from "@/shared/config/web3";
import { BrandMark } from "@/shared/ui/BrandMark/BrandMark";
import { ButtonLink } from "@/shared/ui/Button/ButtonLink";

import styles from "./AppHeader.module.scss";
import { MobileMenu } from "./MobileMenu";
import { navigationLinks } from "./navigation";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="OpenFund — на главную">
          <BrandMark className={styles.brandMark} />
          <span>
            Open<em>Fund</em>
          </span>
        </Link>

        <nav aria-label="Основная навигация" className={styles.navigation}>
          {navigationLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <p className={styles.network} title="Тестовая сеть Ethereum">
            <span aria-hidden="true" className={styles.networkDot} />
            Sepolia
          </p>
          <ButtonLink
            aria-label="Контракт V2 в Sepolia — откроется в новой вкладке"
            className={styles.contractLink}
            href={contractExplorerUrl}
            rel="noreferrer"
            size="compact"
            target="_blank"
            variant="secondary"
          >
            Контракт <span aria-hidden="true">↗</span>
          </ButtonLink>
          <ConnectWallet />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
