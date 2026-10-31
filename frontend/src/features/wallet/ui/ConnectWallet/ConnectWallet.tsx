"use client";

import Image from "next/image";
import { useRef } from "react";
import { useConnect, useConnection, useConnectors, useDisconnect } from "wagmi";

import { Button } from "@/shared/ui/Button/Button";

import { getWalletErrorMessage } from "../../lib/walletErrors";
import { getWalletName } from "../../lib/walletName";
import { WalletMenu } from "../WalletMenu/WalletMenu";
import walletConnectImage from "./assets/wallet-connect.webp";
import styles from "./ConnectWallet.module.scss";

export function ConnectWallet() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const connection = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();

  // При смене кошелька текущий отключаем только после успешного подключения нового.
  const currentConnector = connection.address ? connection.connector : undefined;

  // Кошельки, найденные по EIP-6963, точнее общего «injected»: общий показываем, только если других нет.
  const discovered = connectors.filter((connector) => connector.id !== "injected");
  const walletOptions = discovered.length > 0 ? discovered : connectors;

  const openDialog = () => {
    connect.reset();
    dialogRef.current?.showModal();
  };

  const closeDialog = () => dialogRef.current?.close();

  const selectWallet = (connector: (typeof walletOptions)[number]) => {
    connect.mutate(
      { connector },
      {
        onSuccess: () => {
          if (currentConnector && currentConnector.uid !== connector.uid) {
            disconnect.mutate({ connector: currentConnector });
          }
          closeDialog();
        },
      },
    );
  };

  return (
    <>
      {/* Адрес известен и при «connected», и при «reconnecting» (сессия из cookie): показываем меню сразу. */}
      {connection.address ? (
        <WalletMenu onSwitchWallet={openDialog} />
      ) : (
        <Button onClick={openDialog} size="compact">
          <span className={styles.labelFull}>Подключить кошелёк</span>
          <span className={styles.labelShort}>Кошелёк</span>
        </Button>
      )}

      <dialog
        aria-describedby="connect-wallet-description"
        aria-labelledby="connect-wallet-title"
        className={styles.dialog}
        ref={dialogRef}
      >
        <div className={styles.layout}>
          <div aria-hidden="true" className={styles.visual}>
            <Image
              alt=""
              className={styles.visualImage}
              fill
              placeholder="blur"
              sizes="(max-width: 639px) calc(100vw - 16px), 336px"
              src={walletConnectImage}
            />
            <div className={styles.visualShade} />
            <div className={styles.visualCopy}>
              <span className={styles.networkBadge}>Sepolia · тестовая сеть</span>
              <p className={styles.visualTitle}>Ключи остаются у вас</p>
              <p className={styles.visualText}>
                OpenFund получает только публичный адрес. Подключение не переводит ETH.
              </p>
            </div>
          </div>

          <div className={styles.content}>
            <h2 className={styles.title} id="connect-wallet-title">
              {currentConnector ? "Сменить кошелёк" : "Подключите кошелёк"}
            </h2>
            <p className={styles.lead} id="connect-wallet-description">
              {currentConnector
                ? `Сейчас подключён ${getWalletName(currentConnector)}. Он отключится, когда вы подключите другой.`
                : "Выберите расширение браузера. Подключение не отправляет транзакцию."}
            </p>

            <ul className={styles.wallets}>
              {walletOptions.map((connector) => {
                // Сравниваем сам объект: в mutate мы передали именно этот коннектор.
                const isWaiting = connect.isPending && connect.variables?.connector === connector;
                const isCurrent = connector.uid === currentConnector?.uid;

                return (
                  <li key={connector.uid}>
                    <button
                      aria-busy={isWaiting || undefined}
                      aria-current={isCurrent || undefined}
                      className={styles.wallet}
                      disabled={connect.isPending || isCurrent}
                      onClick={() => selectWallet(connector)}
                      type="button"
                    >
                      {connector.icon ? (
                        <Image
                          alt=""
                          className={styles.walletIcon}
                          height={40}
                          src={connector.icon}
                          unoptimized
                          width={40}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={`${styles.walletIcon} ${styles.walletIconFallback}`}
                        />
                      )}
                      <span className={styles.walletName}>
                        {getWalletName(connector)}
                      </span>
                      {isWaiting ? (
                        <span className={styles.walletState}>
                          <span aria-hidden="true" className={styles.spinner} />
                          Подтвердите подключение
                        </span>
                      ) : isCurrent ? (
                        <span className={styles.walletState}>Подключён</span>
                      ) : (
                        <span aria-hidden="true" className={styles.walletArrow}>
                          →
                        </span>
                      )}
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
          </div>
        </div>

        {/* Крестик последний в разметке: фокус при открытии сразу попадает на первый кошелёк. */}
        <button
          aria-label="Закрыть окно подключения кошелька"
          className={styles.close}
          onClick={closeDialog}
          type="button"
        >
          ×
        </button>
      </dialog>
    </>
  );
}
