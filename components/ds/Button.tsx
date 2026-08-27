import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "./Icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inverse" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: IconName;
  iconRight?: IconName;
  block?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type AsButton = ButtonOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> & { href?: undefined };

type AsLink = ButtonOwnProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonOwnProps> & { href: string };

export type ButtonProps = AsButton | AsLink;

/**
 * Renders a `<button>`, or an `<a>` (via next/link) when given `href`.
 *
 * Navigation must go through `href` rather than wrapping this in a `<Link>`:
 * an anchor containing a button is invalid HTML, puts two controls in the
 * accessibility tree where there is one, and leaves the focus ring styled on
 * an element that isn't the tab stop.
 */
export function Button(props: ButtonProps) {
  const {
    children,
    variant = "primary",
    size = "md",
    iconLeft,
    iconRight,
    block = false,
    className = "",
    ...rest
  } = props;
  const cls = ["ciq-btn", `ciq-btn--${variant}`, `ciq-btn--${size}`, block ? "ciq-btn--block" : "", className]
    .filter(Boolean)
    .join(" ");
  const isq = size === "sm" ? 15 : size === "lg" ? 19 : 17;
  const inner = (
    <>
      {iconLeft ? <Icon name={iconLeft} size={isq} /> : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <Icon name={iconRight} size={isq} /> : null}
    </>
  );

  if (typeof props.href === "string") {
    const { href, ...anchorRest } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <Link className={cls} href={href} {...anchorRest}>
        {inner}
      </Link>
    );
  }

  const { disabled = false, ...buttonRest } = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={cls} disabled={disabled} aria-disabled={disabled || undefined} {...buttonRest}>
      {inner}
    </button>
  );
}
