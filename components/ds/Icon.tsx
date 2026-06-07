/**
 * CompaniesIQ icon set — a curated subset of Lucide (ISC licensed,
 * https://lucide.dev), redrawn as inline SVG path data so the system
 * ships no external icon dependency. 2px stroke, round caps, 24px grid.
 * Ported verbatim from the design bundle's components/core/Icon.jsx.
 */
import React from "react";

const PATHS: Record<string, string[]> = {
  search: ['<circle cx="11" cy="11" r="8"/>', '<path d="m21 21-4.3-4.3"/>'],
  building: ['<rect width="16" height="20" x="4" y="2" rx="2"/>', '<path d="M9 22v-4h6v4"/>', '<path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>'],
  file: ['<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>', '<path d="M14 2v5h5"/>', '<path d="M8 13h8M8 17h8M8 9h2"/>'],
  trendUp: ['<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>', '<polyline points="16 7 22 7 22 13"/>'],
  trendDown: ['<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>', '<polyline points="16 17 22 17 22 11"/>'],
  bell: ['<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', '<path d="M21 16.5c-1.4-1.2-2-2.5-2-4.5V9a7 7 0 1 0-14 0v3c0 2-.6 3.3-2 4.5Z"/>'],
  list: ['<path d="M8 6h13M8 12h13M8 18h13"/>', '<path d="M3 6h.01M3 12h.01M3 18h.01"/>'],
  menu: ['<path d="M3 6h18M3 12h18M3 18h18"/>'],
  filter: ['<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'],
  download: ['<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>', '<polyline points="7 10 12 15 17 10"/>', '<line x1="12" x2="12" y1="15" y2="3"/>'],
  external: ['<path d="M15 3h6v6"/>', '<path d="M10 14 21 3"/>', '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'],
  chevronDown: ['<path d="m6 9 6 6 6-6"/>'],
  chevronRight: ['<path d="m9 18 6-6-6-6"/>'],
  check: ['<path d="M20 6 9 17l-5-5"/>'],
  x: ['<path d="M18 6 6 18M6 6l12 12"/>'],
  arrowRight: ['<path d="M5 12h14"/>', '<path d="m12 5 7 7-7 7"/>'],
  pin: ['<path d="M20 10c0 4.4-8 12-8 12s-8-7.6-8-12a8 8 0 0 1 16 0Z"/>', '<circle cx="12" cy="10" r="3"/>'],
  calendar: ['<path d="M8 2v4M16 2v4"/>', '<rect width="18" height="18" x="3" y="4" rx="2"/>', '<path d="M3 10h18"/>'],
  users: ['<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>', '<circle cx="9" cy="7" r="4"/>', '<path d="M22 21v-2a4 4 0 0 0-3-3.9"/>', '<path d="M16 3.1a4 4 0 0 1 0 7.8"/>'],
  briefcase: ['<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>', '<rect width="20" height="14" x="2" y="6" rx="2"/>'],
  shield: ['<path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1 1 0 0 1 1.5 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/>'],
  alert: ['<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z"/>', '<path d="M12 9v4M12 17h.01"/>'],
  bookmark: ['<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z"/>'],
  settings: ['<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/>', '<circle cx="12" cy="12" r="3"/>'],
  grid: ['<rect width="7" height="7" x="3" y="3" rx="1"/>', '<rect width="7" height="7" x="14" y="3" rx="1"/>', '<rect width="7" height="7" x="14" y="14" rx="1"/>', '<rect width="7" height="7" x="3" y="14" rx="1"/>'],
  barChart: ['<line x1="12" x2="12" y1="20" y2="10"/>', '<line x1="18" x2="18" y1="20" y2="4"/>', '<line x1="6" x2="6" y1="20" y2="16"/>'],
  globe: ['<circle cx="12" cy="12" r="10"/>', '<path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>', '<path d="M2 12h20"/>'],
  plus: ['<path d="M5 12h14M12 5v14"/>'],
  minus: ['<path d="M5 12h14"/>'],
  star: ['<path d="M11.5 2.5 14 8l6 .5-4.5 4 1.4 6L11.5 15 6 18.5 7.5 12.5 3 8.5 9 8Z"/>'],
  clock: ['<circle cx="12" cy="12" r="10"/>', '<polyline points="12 6 12 12 16 14"/>'],
  link: ['<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/>', '<path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>'],
  more: ['<circle cx="12" cy="12" r="1"/>', '<circle cx="19" cy="12" r="1"/>', '<circle cx="5" cy="12" r="1"/>'],
};

export type IconName = keyof typeof PATHS | string;

export interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 18, stroke = 2, color = "currentColor", className = "", style = {} }: IconProps) {
  const d = PATHS[name];
  if (!d) {
    if (typeof console !== "undefined") console.warn(`Icon: unknown name "${name}"`);
    return null;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: d.join("") }}
    />
  );
}

export const ICON_NAMES = Object.keys(PATHS);
