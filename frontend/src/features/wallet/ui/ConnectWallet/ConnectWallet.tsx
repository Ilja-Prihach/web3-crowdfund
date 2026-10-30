"use client";

import Image from "next/image";
import { useRef } from "react";
import { useConnect, useConnection, useConnectors } from "wagmi";

import { shortenAddress } from "@/shared/lib/address";
import { Button } from "@/shared/ui/Button/Button";

import { getWalletErrorMessage } from "../../lib/walletErrors";
import styles from "./ConnectWallet.module.scss";

export function ConnectWallet() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const connection = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();

  // Кошельки, найденные по EIP-6963, точнее общего «injected»: общий показываем, только если других нет.
  const discovered = connectors.filter((connector) => connector.id !== "injected");
  const walletOptions = discovered.length > 0 ? discovered : connectors;

  if (connection.status === "connected") {
    return <p className={styles.address}>{shortenAddress(connection.address)}</p>;
  }

  const openDialog = () => {
    connect.reset();
    dialogRef.current?.showModal();
  };

  const closeDialog = () => dialogRef.current?.close();

  return (
    <>
      <Button onClick={openDialog} size="compact">
        <span className={styles.labelFull}>Подключить кошелёк</span>
        <span className={styles.labelShort}>Кошелёк</span>
      </Button>

      <dialog aria-labelledby="connect-wallet-title" className={styles.dialog} ref={dialogRef}>
        <h2 className={styles.title} id="connect-wallet-title">
          Подключите кошелёк
        </h2>
        <p className={styles.lead}>
          OpenFund не хранит ключи. Подпись транзакций всегда происходит в вашем кошельке.
        </p>

        <ul className={styles.wallets}>
          {walletOptions.map((connector) => {
            // Сравниваем сам объект: в mutate мы передали именно этот коннектор.
            const isWaiting = connect.isPending && connect.variables?.connector === connector;

            return (
              <li key={connector.uid}>
                <button
                  className={styles.wallet}
                  disabled={connect.isPending}
                  onClick={() => connect.mutate({ connector }, { onSuccess: closeDialog })}
                  type="button"
                >
                  {connector.icon ? (
                    <Image
                      alt=""
                      className={styles.walletIcon}
                      height={36}
                      src={connector.icon}
                      unoptimized
                      width={36}
                    />
                  ) : (
                    <span aria-hidden="true" className={styles.walletIcon} />
                  )}
                  <span>{connector.id === "injected" ? "Браузерный кошелёк" : connector.name}</span>
                  {isWaiting ? (
                    <span className={styles.walletState}>Подтвердите в кошельке…</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        {connect.error ? (
          <p className={styles.error} role="alert">
            {getWalletErrorMessage(connect.error)}
          </p>
        ) : null}

        <p className={styles.hint}>
          Нет кошелька?{" "}
          <a href="https://metamask.io/download/" rel="noreferrer" target="_blank">
            Установить MetaMask <span aria-hidden="true">↗</span>
          </a>
        </p>

        {/* Крестик последний в разметке: фокус при открытии сразу попадает на первый кошелёк. */}
        <button aria-label="Закрыть" className={styles.close} onClick={closeDialog} type="button">
          ×
        </button>
      </dialog>
    </>
  );
}
