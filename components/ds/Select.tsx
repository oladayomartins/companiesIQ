import React from "react";
import { Icon } from "./Icon";

export type SelectOption = string | { value: string; label: string };

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  options?: SelectOption[];
  size?: "sm" | "md";
  placeholder?: string;
}

export function Select({ options = [], value, onChange, size = "md", placeholder, disabled = false, className = "", ...rest }: SelectProps) {
  const cls = ["ciq-select", `ciq-select--${size}`, disabled ? "ciq-select--disabled" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls}>
      <select value={value} onChange={onChange} disabled={disabled} {...rest}>
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => {
          const val = typeof o === "string" ? o : o.value;
          const lab = typeof o === "string" ? o : o.label;
          return (
            <option key={val} value={val}>
              {lab}
            </option>
          );
        })}
      </select>
      <span className="ciq-select__chev">
        <Icon name="chevronDown" size={16} />
      </span>
    </div>
  );
}
