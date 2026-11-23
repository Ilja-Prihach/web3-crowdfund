import { ButtonLink } from "@/shared/ui/Button/ButtonLink";

import styles from "./ProjectStatusSection.module.scss";

const sourceUrl = "https://github.com/Ilja-Prihach/web3-crowdfund";

export function ProjectStatusSection() {
  return (
    <section aria-labelledby="project-status-title">
      <div className={styles.inner}>
        <div className={styles.card}>
          <div className={styles.copy}>
            <h2 className={styles.title} id="project-status-title">
              Запустите свой проект
            </h2>
            <p>
              Расскажите, что хотите сделать, выберите цель и режим сбора. Условия будут записаны в контракте Sepolia.
            </p>
          </div>

          <div className={styles.side}>
            <div className={styles.actions}>
              <ButtonLink
                href="/campaigns/new"
                size="large"
                variant="accent"
              >
                Создать сбор
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
