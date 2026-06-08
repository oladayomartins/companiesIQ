import Link from "next/link";
import { Button } from "@/components/ds";

// Generic dark chrome for the public, indexable SEO pages (industry, market,
// etc.). Reuses the .report-public / .rep-head / .rep-foot styles so the public
// surface is visually consistent with the company report.
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ciq-dark report-public">
      <header className="rep-head">
        <Link className="rep-head__logo" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/ciq-mark-ink.svg" width={26} height={26} alt="" />
          <span className="rep-head__word">
            Companies<span className="rep-head__iq">IQ</span>
          </span>
        </Link>
        <div className="rep-head__cta">
          <Link className="rep-head__link" href="/sign-in">
            Sign in
          </Link>
          <Link href="/pricing">
            <Button variant="primary" iconRight="arrowRight">
              Get full access
            </Button>
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="rep-foot">
        <div className="rep-foot__inner">
          <span className="rep-foot__brand">
            Companies<span className="rep-head__iq">IQ</span>
          </span>
          <span className="rep-foot__note">
            Public business data from Companies House, reused under the Open Government Licence.
          </span>
          <nav className="rep-foot__nav">
            <Link href="/industry">Industries</Link>
            <Link href="/market">Markets</Link>
            <Link href="/sources">Sources</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// A reusable bottom-of-page conversion band for the SEO landing pages.
export function PublicCta({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="public-cta">
      <h2 className="public-cta__title">{title}</h2>
      <p className="public-cta__sub">{sub}</p>
      <div className="public-cta__row">
        <Link href="/sign-in">
          <Button variant="primary" iconRight="arrowRight">
            Create a free account
          </Button>
        </Link>
        <Link href="/pricing">
          <Button variant="secondary">See plans</Button>
        </Link>
      </div>
    </div>
  );
}
