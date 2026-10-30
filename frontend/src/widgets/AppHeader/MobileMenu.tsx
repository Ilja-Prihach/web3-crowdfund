"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { contractExplorerUrl } from "@/shared/config/web3";
import { ButtonLink } from "@/shared/ui/Button/ButtonLink";

import styles from "./MobileMenu.module.scss";
import { navigationLinks } from "./navigation";

const panelId = "mobile-navigation";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <div className={styles.menu}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Закрыть меню" : "Открыть меню"}
        className={styles.toggle}
        data-open={isOpen || undefined}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true" className={styles.bars} />
      </button>

      <nav aria-label="Мобильная навигация" className={styles.panel} hidden={!isOpen} id={panelId}>
        <ul className={styles.links}>
          {navigationLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={close}>
                {link.label}
                <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <ButtonLink
          aria-label="Контракт V2 в Sepolia — откроется в новой вкладке"
          fullWidth
          href={contractExplorerUrl}
          onClick={close}
          rel="noreferrer"
          target="_blank"
        >
          Контракт в Etherscan <span aria-hidden="true">↗</span>
        </ButtonLink>
      </nav>
    </div>
  );
}
