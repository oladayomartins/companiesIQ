"use client";
import Link from "next/link";

const COLS: [string, string[]][] = [
  ["Product", ["Search", "Company profiles", "Watchlists", "Signals", "Analytics", "API"]],
  ["Data", ["Coverage", "Sources", "SIC explorer", "Methodology", "Changelog"]],
  ["Company", ["About", "Customers", "Careers", "Press", "Contact"]],
  ["Legal", ["Privacy", "Terms", "Data protection", "Status"]],
];

// Footer items that resolve to a real route; everything else is a placeholder.
const ROUTES: Record<string, string> = {
  Search: "/app/companies",
  "Company profiles": "/app/companies",
  Watchlists: "/app/watchlists",
  Signals: "/app/alerts",
  Analytics: "/app/analytics",
  Sources: "/sources",
  Methodology: "/sources",
  Coverage: "/sources",
  About: "/#about",
};

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="site-foot__inner">
        <div className="site-foot__brand">
          <div className="site-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/ciq-mark.svg" width={28} height={28} alt="" />
            <span className="site-logo__word">
              Companies<span className="site-logo__iq">IQ</span>
            </span>
          </div>
          <p className="site-foot__tag">UK business intelligence from the public register.</p>
          <p className="site-foot__src mono">Data © Crown copyright, Companies House. Reused under the Open Government Licence.</p>
        </div>
        <div className="site-foot__cols">
          {COLS.map(([h, items]) => (
            <div className="foot-col" key={h}>
              <div className="foot-col__h mono">{h}</div>
              {items.map((i) =>
                ROUTES[i] ? (
                  <Link className="foot-col__link" key={i} href={ROUTES[i]}>
                    {i}
                  </Link>
                ) : (
                  <a className="foot-col__link" key={i} href="#" onClick={(e) => e.preventDefault()}>
                    {i}
                  </a>
                )
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="site-foot__bar">
        <span className="mono">© 2026 CompaniesIQ Ltd · Company no. 14820317</span>
        <span className="mono">London, United Kingdom</span>
      </div>
    </footer>
  );
}
