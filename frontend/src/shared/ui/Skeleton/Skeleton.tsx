import styles from "./Skeleton.module.scss";

type SkeletonVariant = "line" | "title" | "control" | "panel";

type SkeletonProps = {
  label?: string;
  variant?: SkeletonVariant;
};

export function Skeleton({ label = "Загрузка содержимого", variant = "line" }: SkeletonProps) {
  return (
    <div className={[styles.skeleton, styles[variant]].join(" ")} role="status">
      <span className={styles.visuallyHidden}>{label}</span>
    </div>
  );
}
