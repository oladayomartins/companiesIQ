import React from "react";
import { Icon, type IconName } from "./Icon";

export interface TagProps {
  children?: React.ReactNode;
  icon?: IconName;
  active?: boolean;
  onRemove?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

export function Tag({ children, icon, active = false, onRemove, onClick, className = "" }: TagProps) {
  const clickable = !!onClick;
  const cls = ["ciq-tag", active ? "ciq-tag--active" : "", clickable ? "ciq-tag--clickable" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} onClick={onClick}>
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
      {onRemove ? (
        <span
          className="ciq-tag__remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          role="button"
          aria-label="Remove"
        >
          <Icon name="x" size={13} stroke={2.5} />
        </span>
      ) : null}
    </span>
  );
}
