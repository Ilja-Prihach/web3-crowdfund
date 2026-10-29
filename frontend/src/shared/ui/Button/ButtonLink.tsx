import type { AnchorHTMLAttributes } from "react";

import { getButtonClassName, type ButtonSize, type ButtonVariant } from "./Button";

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function ButtonLink({
  children,
  className,
  fullWidth = false,
  size = "regular",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <a {...props} className={getButtonClassName({ className, fullWidth, size, variant })}>
      {children}
    </a>
  );
}
