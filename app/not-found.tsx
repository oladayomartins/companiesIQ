import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ds";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

const LINKS: [string, string][] = [
  ["Industries", "/industry"],
  ["Markets", "/market"],
  ["Cities", "/city"],
  ["Signals", "/signals"],
  ["Blog", "/blog"],
  ["Pricing", "/pricing"],
];

export default function NotFound() {
  return (
    <main className="site notfound">
      <Link className="notfound__brand site-logo" href="/">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/ciq-mark.svg" width={28} height={28} alt="" />
        <span className="site-logo__word">
          Companies<span className="site-logo__iq">IQ</span>
        </span>
      </Link>

      <div className="notfound__inner">
        <span className="eyebrow">404</span>
        <h1 className="notfound__title">This page isn&rsquo;t on the register.</h1>
        <p className="notfound__sub">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved. Let&rsquo;s get you back to the data.
        </p>
        <div className="notfound__cta">
          <Link href="/">
            <Button variant="primary" iconRight="arrowRight">
              Back to home
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="secondary">Sign in</Button>
          </Link>
        </div>
        <div className="notfound__links">
          <span className="notfound__links-label mono">Explore</span>
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
