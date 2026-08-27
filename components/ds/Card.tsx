import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "flat" | "raised" | "ghost";
  interactive?: boolean;
}

export function Card({ children, variant = "default", interactive = false, className = "", ...rest }: CardProps) {
  const cls = [
    "ciq-card",
    variant !== "default" ? `ciq-card--${variant}` : "",
    interactive ? "ciq-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title?: React.ReactNode;
  /** Heading level for `title`. Defaults to 3; pass 2 when the card sits
   *  directly under the page's h1, so the outline doesn't skip a level. */
  titleAs?: "h2" | "h3" | "h4";
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function CardHeader({ title, titleAs: TitleTag = "h3", subtitle, action, children }: CardHeaderProps) {
  return (
    <div className="ciq-card__head">
      {children || (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {subtitle ? <span className="ciq-card__sub">{subtitle}</span> : null}
          {title ? <TitleTag className="ciq-card__title">{title}</TitleTag> : null}
        </div>
      )}
      {action ? <div className="ciq-card__action">{action}</div> : null}
    </div>
  );
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  flush?: boolean;
}

export function CardBody({ children, flush = false, className = "", ...rest }: CardBodyProps) {
  return (
    <div className={["ciq-card__body", flush ? "ciq-card__body--flush" : "", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
