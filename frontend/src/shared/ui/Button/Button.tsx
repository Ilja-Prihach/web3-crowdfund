import type { ButtonHTMLAttributes } from "react";

import styles from "./Button.module.scss";

type ButtonVariant = "primary" | "accent" | "secondary" | "quiet";
type ButtonSize = "compact" | "regular";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  isLoading = false,
  size = "regular",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const buttonClassName = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      className={buttonClassName}
      disabled={disabled || isLoading}
      type={type}
    >
      <span>{children}</span>
      {isLoading ? <span aria-hidden="true" className={styles.spinner} /> : null}
    </button>
  );
}
