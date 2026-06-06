import React from "react";
import { Icon } from "./Icon";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export function Checkbox({ checked, defaultChecked, onChange, label, disabled = false, className = "", ...rest }: CheckboxProps) {
  return (
    <label className={["ciq-check", disabled ? "ciq-check--disabled" : "", className].filter(Boolean).join(" ")}>
      <input type="checkbox" checked={checked} defaultChecked={defaultChecked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="ciq-check__box">
        <Icon name="check" size={13} stroke={3} />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
