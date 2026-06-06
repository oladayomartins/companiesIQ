import React from "react";
import { Icon, type IconName } from "./Icon";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  iconLeft?: IconName;
  iconRight?: IconName;
  size?: "sm" | "md" | "lg";
}

export function Input({ label, hint, error, iconLeft, iconRight, size = "md", id, className = "", disabled = false, ...rest }: InputProps) {
  const fid = id || (label ? "ciq-" + label.toLowerCase().replace(/\s+/g, "-") : undefined);
  const box = [
    "ciq-input",
    `ciq-input--${size}`,
    error ? "ciq-input--error" : "",
    disabled ? "ciq-input--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={["ciq-field", className].filter(Boolean).join(" ")}>
      {label ? (
        <label className="ciq-field__label" htmlFor={fid}>
          {label}
        </label>
      ) : null}
      <div className={box}>
        {iconLeft ? (
          <span className="ciq-input__icon">
            <Icon name={iconLeft} size={17} />
          </span>
        ) : null}
        <input id={fid} disabled={disabled} {...rest} />
        {iconRight ? (
          <span className="ciq-input__icon">
            <Icon name={iconRight} size={17} />
          </span>
        ) : null}
      </div>
      {error ? (
        <span className="ciq-field__hint ciq-field__hint--error">{error}</span>
      ) : hint ? (
        <span className="ciq-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}
