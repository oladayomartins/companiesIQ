import Link from "next/link";
import { Button } from "@/components/ds";

// Slim, dark chrome for the PUBLIC company report (/company/[number]).
// These pages live outside the /app shell — cold visitors and Googlebot land
// here — so they get their own header (sign-in / dashboard) and a light footer.
export function PublicReportChrome({ unlocked, children }: { unlocked: boolean; children: React.ReactNode }) {
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
          {unlocked ? (
            <Link href="/app">
              <Button variant="secondary" iconRight="arrowRight">
                Open dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link className="rep-head__link" href="/sign-in">
                Sign in
              </Link>
              <Link href="/pricing">
                <Button variant="primary" iconRight="arrowRight">
                  Get full access
                </Button>
              </Link>
            </>
          )}
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
            <Link href="/sources">Sources</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/sign-in">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
