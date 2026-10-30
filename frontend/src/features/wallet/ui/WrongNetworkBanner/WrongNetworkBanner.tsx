"use client";

import { useSwitchChain } from "wagmi";

import { supportedChain } from "@/shared/config/web3";
import { Button } from "@/shared/ui/Button/Button";

import { getWalletErrorMessage } from "../../lib/walletErrors";
import { useWalletNetwork } from "../../model/useWalletNetwork";
import styles from "./WrongNetworkBanner.module.scss";

export function WrongNetworkBanner() {
  const { isWrongNetwork } = useWalletNetwork();
  const switchChain = useSwitchChain();

  if (!isWrongNetwork) return null;

  return (
    <div className={styles.banner} role="status">
      <div className={styles.inner}>
        <span aria-hidden="true" className={styles.icon}>
          ⇄
        </span>
        <p className={styles.text}>
          <strong>Кошелёк подключён к другой сети.</strong> OpenFund работает только в тестовой
          сети Sepolia, в других сетях действия с контрактом недоступны.
        </p>
        <Button
          isLoading={switchChain.isPending}
          onClick={() => switchChain.mutate({ chainId: supportedChain.id })}
          size="compact"
        >
          Переключить на Sepolia
        </Button>
      </div>
      {switchChain.error ? (
        <p className={styles.error} role="alert">
          {getWalletErrorMessage(switchChain.error)}
        </p>
      ) : null}
    </div>
  );
}
