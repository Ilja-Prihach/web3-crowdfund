import { ButtonLink } from "@/shared/ui/Button/ButtonLink";

import styles from "./ProjectStatusSection.module.scss";

const contractUrl =
  "https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A";
const sourceUrl = "https://github.com/Ilja-Prihach/web3-crowdfund";

export function ProjectStatusSection() {
  return (
    <section aria-labelledby="project-status-title">
      <div className={styles.inner}>
        <div className={styles.card}>
          <div className={styles.copy}>
            <h2 className={styles.title} id="project-status-title">
              Контракт уже в сети. Интерфейс собирается поэтапно
            </h2>
            <p>
              Сейчас можно проверить код, состояние и транзакции V2. Подключение кошелька,
              каталог и создание сборов появятся на следующих этапах.
            </p>
          </div>

          <div className={styles.side}>
            <div className={styles.actions}>
              <ButtonLink
                aria-label="Контракт V2 в Etherscan — откроется в новой вкладке"
                href={contractUrl}
                rel="noreferrer"
                size="large"
                target="_blank"
                variant="accent"
              >
                Контракт в Etherscan <span aria-hidden="true">↗</span>
              </ButtonLink>
              <a
                aria-label="Исходный код OpenFund — откроется в новой вкладке"
                className={styles.sourceLink}
                href={sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                Исходный код <span aria-hidden="true">↗</span>
              </a>
            </div>
            <p className={styles.address}>Crowdfunding V2 · 0x6890…077A</p>
          </div>
        </div>
      </div>
    </section>
  );
}
