import Link from "next/link";
import { Button } from "@/components/ds";

// Chrome for the PUBLIC company report (/company/[number]).
//
// Light, like every other page reachable without signing in — the dark theme is
// the signed-in app's alone. This shell keeps its own header rather than using
// SiteHeader because the report's CTA is state-dependent (sign in / upgrade /
// open dashboard) in a way the marketing nav is not.
export function PublicReportChrome({
  unlocked,
  signedIn = false,
  children,
}: {
  unlocked: boolean;
  signedIn?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="site public-page report-public">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="rep-head">
        <Link className="rep-head__logo" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/ciq-mark-ink.svg" width={26} height={26} alt="" />
          <span className="rep-head__word">
            Companies<span className="rep-head__iq">IQ</span>
          </span>
        </Link>
        <div className="rep-head__cta">
          {unlocked ? (
            <Button href="/app" variant="secondary" iconRight="arrowRight">
              Open dashboard
            </Button>
          ) : signedIn ? (
            <>
              <Link className="rep-head__link" href="/app">
                Dashboard
              </Link>
              <Button href="/pricing" variant="primary" iconRight="arrowRight">
                Upgrade
              </Button>
            </>
          ) : (
            <>
              <Link className="rep-head__link" href="/sign-in">
                Sign in
              </Link>
              <Button href="/pricing" variant="primary" iconRight="arrowRight">
                Get full access
              </Button>
            </>
          )}
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      <footer className="rep-foot">
        <div className="rep-foot__inner">
          <span className="rep-foot__brand">
            Companies<span className="rep-head__iq">IQ</span>
          </span>
          <span className="rep-foot__note">
            Public business data from Companies House, reused under the Open Government Licence.
          </span>
          <nav className="rep-foot__nav">
            <Link href="/sources">Sources</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/sign-in">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
