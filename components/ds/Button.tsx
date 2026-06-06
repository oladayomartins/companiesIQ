import React from "react";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: IconName;
  iconRight?: IconName;
  block?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  block = false,
  disabled = false,
  className = "",
  ...rest
}: ButtonProps) {
  const cls = ["ciq-btn", `ciq-btn--${variant}`, `ciq-btn--${size}`, block ? "ciq-btn--block" : "", className]
    .filter(Boolean)
    .join(" ");
  const isq = size === "sm" ? 15 : size === "lg" ? 19 : 17;
  return (
    <button className={cls} disabled={disabled} aria-disabled={disabled || undefined} {...rest}>
      {iconLeft ? <Icon name={iconLeft} size={isq} /> : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={isq} /> : null}
    </button>
  );
}
