import styles from "./FundingModesSection.module.scss";

export function FundingModesSection() {
  return (
    <section aria-labelledby="funding-modes-title" className={styles.section} id="funding-modes">
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.index}>1 / Условия сбора</p>
          <h2 className={styles.title} id="funding-modes-title">
            Два режима — разные права на возврат
          </h2>
          <p className={styles.intro}>
            Режим выбирается при создании кампании. Контракт применяет его правила к
            каждому пожертвованию, возврату и выводу средств.
          </p>
        </header>

        <div className={styles.modes}>
          <article className={styles.fixedMode}>
            <div className={styles.modeHeader}>
              <p className={styles.modeNumber}>A</p>
              <div>
                <p className={styles.modeLabel}>FixedDeadline</p>
                <h3 className={styles.modeTitle}>Сбор к сроку</h3>
              </div>
            </div>

            <ol className={styles.steps}>
              <li>
                <span>Создатель задаёт цель и срок от 1 до 365 дней.</span>
              </li>
              <li>
                <span>Достижение цели сразу делает кампанию успешной.</span>
              </li>
              <li>
                <span>Если срок наступил раньше, участники возвращают свои вклады.</span>
              </li>
            </ol>

            <p className={styles.note}>
              После первого пожертвования дедлайн изменить нельзя.
            </p>
          </article>

          <article className={styles.openMode}>
            <div className={styles.modeHeader}>
              <p className={styles.modeNumber}>B</p>
              <div>
                <p className={styles.modeLabel}>OpenEnded</p>
                <h3 className={styles.modeTitle}>Открытая цель</h3>
              </div>
            </div>

            <ol className={styles.steps}>
              <li>
                <span>У кампании есть цель, но нет искусственного дедлайна.</span>
              </li>
              <li>
                <span>До достижения цели участник может вернуть активный вклад.</span>
              </li>
              <li>
                <span>После достижения цели возвраты и новые пожертвования закрываются.</span>
              </li>
            </ol>

            <p className={styles.note}>Создатель может отменить активную кампанию.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
