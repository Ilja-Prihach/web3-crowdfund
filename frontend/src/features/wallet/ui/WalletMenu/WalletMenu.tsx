"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { useConnection, useDisconnect } from "wagmi";

import { supportedChain } from "@/shared/config/web3";
import { addressHue, shortenAddress } from "@/shared/lib/address";

import { getWalletName } from "../../lib/walletName";

import styles from "./WalletMenu.module.scss";

const panelId = "wallet-menu";

type WalletMenuProps = {
  onSwitchWallet: () => void;
};

export function WalletMenu({ onSwitchWallet }: WalletMenuProps) {
  const connection = useConnection();
  const disconnect = useDisconnect();
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    // Клик мимо меню закрывает его, клик внутри — нет.
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [isOpen]);

  const { address } = connection;

  if (!address) return null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 2000);
  };

  const copyLabel = {
    idle: "Скопировать адрес",
    copied: "Скопировано ✓",
    failed: "Не удалось скопировать",
  }[copyState];

  return (
    <div className={styles.menu} ref={rootRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={`Кошелёк ${shortenAddress(address)}`}
        className={styles.trigger}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span
          aria-hidden="true"
          className={styles.avatar}
          style={{ "--avatar-hue": addressHue(address) } as CSSProperties}
        />
        <span className={styles.address}>{shortenAddress(address)}</span>
        <span aria-hidden="true" className={styles.chevron} />
      </button>

      <div className={styles.panel} hidden={!isOpen} id={panelId}>
        <p className={styles.label}>
          Подключён через {connection.connector ? getWalletName(connection.connector) : "кошелёк"}
        </p>
        <p className={styles.fullAddress}>{address}</p>
        <button className={styles.item} onClick={copyAddress} type="button">
          {copyLabel}
        </button>
        <a
          className={styles.item}
          href={`${supportedChain.blockExplorers.default.url}/address/${address}`}
          rel="noreferrer"
          target="_blank"
        >
          Открыть в Etherscan <span aria-hidden="true">↗</span>
        </a>
        <button
          className={styles.item}
          onClick={() => {
            setIsOpen(false);
            onSwitchWallet();
          }}
          type="button"
        >
          Сменить кошелёк
        </button>
        <button
          className={`${styles.item} ${styles.danger}`}
          onClick={() => {
            disconnect.mutate();
            setIsOpen(false);
          }}
          type="button"
        >
          Отключить
        </button>
      </div>
    </div>
  );
}
