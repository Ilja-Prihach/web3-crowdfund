import Image from "next/image";
import type { ReactNode } from "react";

import { SectionHeader } from "@/shared/ui/SectionHeader/SectionHeader";

import trustVaultImage from "./assets/trust-vault.webp";
import styles from "./TrustSection.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" className={styles.icon} focusable="false" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

const guarantees = [
  {
    text: "Учёт цели, режима, срока и суммы",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </Icon>
    ),
  },
  {
    text: "Возврат вклада по правилам режима",
    icon: (
      <Icon>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </Icon>
    ),
  },
  {
    text: "Вывод только после достижения цели",
    icon: (
      <Icon>
        <rect height="11" rx="2" width="16" x="4" y="10" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </Icon>
    ),
  },
  {
    text: "Публичные события каждого перевода",
    icon: (
      <Icon>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
        <path d="M9 8h6M9 12h6" />
      </Icon>
    ),
  },
];

const limitations = [
  {
    text: "Что автор завершит проект",
    icon: (
      <Icon>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </Icon>
    ),
  },
  {
    text: "Что результат окажется качественным",
    icon: (
      <Icon>
        <path d="M12 2l3 7h7l-5.5 4.5 2 7.5L12 17l-6.5 4 2-7.5L2 9h7z" />
      </Icon>
    ),
  },
  {
    text: "Что описание подтверждает личность автора",
    icon: (
      <Icon>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </Icon>
    ),
  },
  {
    text: "Выполнение договорённостей вне блокчейна",
    icon: (
      <Icon>
        <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
        <path d="M14 3h7v7M21 3l-9 9" />
      </Icon>
    ),
  },
];

export function TrustSection() {
  return (
    <section aria-labelledby="trust-title" id="trust">
      <div className={styles.inner}>
        <SectionHeader
          eyebrow="Граница доверия"
          title="Код отвечает за деньги, но не за обещания"
          titleId="trust-title"
        />

        <div className={styles.layout}>
          <article className={styles.guarantees}>
            <p className={styles.badge}>✓ Гарантирует код</p>
            <h3 className={styles.cardTitle}>Внутри контракта</h3>
            <ul className={styles.list}>
              {guarantees.map((item) => (
                <li key={item.text}>
                  <span className={styles.iconTile}>{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
            <p className={styles.note}>✓ 77 тестов · 100% покрытия контракта</p>
          </article>

          <div className={styles.vault}>
            <Image
              alt=""
              className={styles.art}
              fill
              placeholder="blur"
              sizes="(max-width: 959px) calc(100vw - 2rem), (max-width: 1440px) 32vw, 480px"
              src={trustVaultImage}
            />
            <p className={styles.vaultTag}>◆ Смарт-контракт V2</p>
            <div className={styles.vaultFoot}>
              <p>
                <strong>Верифицирован в Sepolia</strong>
                <span>0x6890…077A</span>
              </p>
              <a
                aria-label="Проверить контракт V2 в Etherscan — откроется в новой вкладке"
                href={contractUrl}
                rel="noreferrer"
                target="_blank"
              >
                Etherscan <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          <article className={styles.limitations}>
            <p className={styles.badge}>✕ Не гарантирует</p>
            <h3 className={styles.cardTitle}>За пределами кода</h3>
            <ul className={styles.list}>
              {limitations.map((item) => (
                <li key={item.text}>
                  <span className={styles.iconTile}>{item.icon}</span>
                  {item.text}
                </li>
              ))}
            </ul>
            <p className={styles.note}>! Изучите автора и описание до перевода</p>
          </article>
        </div>
      </div>
    </section>
  );
}
