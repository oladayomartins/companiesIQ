"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button, Icon } from "@/components/ds";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const LINKS: [string, string][] = [
  ["/product", "Product"],
  ["/use-cases", "Use cases"],
  ["/industry", "Industries"],
  ["/data", "Data"],
  ["/pricing", "Pricing"],
];

export function SiteHeader() {
  const pathname = usePathname();
  // Swap the auth CTAs once we know the visitor is signed in.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // Below 980px the horizontal nav collapses into this panel — without it the
  // whole marketing site is unreachable from a phone.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setSignedIn(false);
      return;
    }
    sb.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);
  // Close on navigation, so tapping a link doesn't leave the panel hanging open.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  return (
    <header className="site-head">
      <div className="site-head__inner">
        <Link className="site-logo" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/ciq-mark.svg" width={28} height={28} alt="" />
          <span className="site-logo__word">
            Companies<span className="site-logo__iq">IQ</span>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          {LINKS.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                className={"site-nav__link" + (active ? " is-active" : "")}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="site-head__cta">
          {signedIn ? (
            <Button href="/app" variant="primary" iconRight="arrowRight">
              Open app
            </Button>
          ) : (
            <>
              <Link className="site-nav__link" href="/sign-in">
                Sign in
              </Link>
              <Button href="/app" variant="primary" iconRight="arrowRight">
                Get started
              </Button>
            </>
          )}
        </div>
        <button
          type="button"
          className="site-burger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <Icon name={menuOpen ? "x" : "menu"} size={20} />
        </button>
      </div>

      <div id="site-menu" className="site-menu" hidden={!menuOpen}>
        <nav className="site-menu__nav" aria-label="Main, mobile">
          {LINKS.map(([href, label]) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                className={"site-menu__link" + (active ? " is-active" : "")}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                {label}
                <Icon name="chevronRight" size={16} />
              </Link>
            );
          })}
        </nav>
        <div className="site-menu__foot">
          {signedIn ? (
            <Button href="/app" variant="primary" iconRight="arrowRight" block>
              Open app
            </Button>
          ) : (
            <>
              <Button href="/sign-in" variant="secondary" block>
                Sign in
              </Button>
              <Button href="/app" variant="primary" iconRight="arrowRight" block>
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
