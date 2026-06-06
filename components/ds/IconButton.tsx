import React from "react";
import { Icon, type IconName } from "./Icon";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  variant?: "ghost" | "solid" | "accent";
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function IconButton({ icon, variant = "ghost", size = "md", label, className = "", ...rest }: IconButtonProps) {
  const cls = ["ciq-iconbtn", `ciq-iconbtn--${variant}`, `ciq-iconbtn--${size}`, className].filter(Boolean).join(" ");
  const isq = size === "sm" ? 16 : size === "lg" ? 20 : 18;
  return (
    <button className={cls} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={isq} />
    </button>
  );
}
