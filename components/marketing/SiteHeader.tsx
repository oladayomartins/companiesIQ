"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ds";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const LINKS: [string, string][] = [
  ["/#product", "Product"],
  ["/#data", "Data"],
  ["/pricing", "Pricing"],
  ["/#about", "About"],
];

export function SiteHeader() {
  const pathname = usePathname();
  // Swap the auth CTAs once we know the visitor is signed in.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setSignedIn(false);
      return;
    }
    sb.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);
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
        <nav className="site-nav">
          {LINKS.map(([href, label]) => {
            const active = href === "/pricing" && pathname === "/pricing";
            return (
              <Link key={href} className={"site-nav__link" + (active ? " is-active" : "")} href={href}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="site-head__cta">
          {signedIn ? (
            <Link href="/app">
              <Button variant="primary" iconRight="arrowRight">
                Open app
              </Button>
            </Link>
          ) : (
            <>
              <Link className="site-nav__link" href="/sign-in">
                Sign in
              </Link>
              <Link href="/app">
                <Button variant="primary" iconRight="arrowRight">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
