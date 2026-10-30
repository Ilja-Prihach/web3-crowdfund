"use client";

import { supportedChain } from "@/shared/config/web3";

import { useWalletNetwork } from "../../model/useWalletNetwork";
import styles from "./NetworkBadge.module.scss";

export function NetworkBadge() {
  const { isWrongNetwork } = useWalletNetwork();

  return (
    <p
      className={isWrongNetwork ? `${styles.badge} ${styles.wrong}` : styles.badge}
      title={isWrongNetwork ? "Кошелёк подключён не к Sepolia" : "Тестовая сеть Ethereum"}
    >
      <span aria-hidden="true" className={styles.dot} />
      {isWrongNetwork ? "Другая сеть" : supportedChain.name}
    </p>
  );
}
