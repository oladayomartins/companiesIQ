import React from "react";

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

export function Switch({ checked, defaultChecked, onChange, label, disabled = false, className = "", ...rest }: SwitchProps) {
  return (
    <label className={["ciq-switch", disabled ? "ciq-switch--disabled" : "", className].filter(Boolean).join(" ")}>
      <input type="checkbox" role="switch" checked={checked} defaultChecked={defaultChecked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="ciq-switch__track">
        <span className="ciq-switch__thumb" />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}
