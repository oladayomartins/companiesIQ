"use client";
import Link from "next/link";

// Every entry resolves to a real, live route — no placeholder/dead links.
const COLS: [string, [string, string][]][] = [
  [
    "Explore",
    [
      ["Industries", "/industry"],
      ["Markets", "/market"],
      ["Cities", "/city"],
      ["Signals", "/signals"],
      ["Pricing", "/pricing"],
    ],
  ],
  [
    "Data",
    [
      ["Sources & methodology", "/sources"],
      ["Blog", "/blog"],
    ],
  ],
  [
    "Company",
    [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Sign in", "/sign-in"],
    ],
  ],
  [
    "Legal",
    [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  ],
];

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
          <p className="site-foot__tag">The UK company intelligence platform — newly registered companies, market trends and new-company alerts from Companies House data.</p>
          <p className="site-foot__src mono">Data © Crown copyright, Companies House. Reused under the Open Government Licence.</p>
        </div>
        <div className="site-foot__cols">
          {COLS.map(([h, items]) => (
            <div className="foot-col" key={h}>
              <div className="foot-col__h mono">{h}</div>
              {items.map(([label, href]) => (
                <Link className="foot-col__link" key={label} href={href}>
                  {label}
                </Link>
              ))}
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
