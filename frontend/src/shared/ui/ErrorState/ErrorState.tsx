import type { ReactNode } from "react";

import styles from "./ErrorState.module.scss";

type ErrorStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function ErrorState({ action, description, title }: ErrorStateProps) {
  return (
    <section className={styles.state} role="alert">
      <p className={styles.label}>Не удалось выполнить запрос</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}
