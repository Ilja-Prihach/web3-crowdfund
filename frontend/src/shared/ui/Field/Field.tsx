import type { InputHTMLAttributes } from "react";

import styles from "./Field.module.scss";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function Field({
  className,
  error,
  hint,
  id,
  label,
  required,
  ...inputProps
}: FieldProps) {
  const descriptionIds = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        <span>{label}</span>
        {required ? <span className={styles.required}>обязательно</span> : null}
      </label>
      <input
        {...inputProps}
        aria-describedby={descriptionIds || undefined}
        aria-invalid={error ? true : undefined}
        className={[styles.input, error ? styles.inputError : undefined, className]
          .filter(Boolean)
          .join(" ")}
        id={id}
        required={required}
      />
      {hint ? (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
