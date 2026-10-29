import type { ReactNode } from "react";

import styles from "./SectionHeader.module.scss";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  titleId: string;
  aside?: ReactNode;
};

export function SectionHeader({ aside, eyebrow, title, titleId }: SectionHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
      </div>
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </header>
  );
}
