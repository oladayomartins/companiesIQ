"use client";
// Shown when the company page throws — in practice, when Companies House is
// rate-limiting us and we hold no substantial stored copy (see page.tsx). The
// page throws on purpose so the response is a 5xx: crawlers treat that as
// temporary (no indexing of this message as the company's content, and a
// slower crawl), while people get a clear way on.
import Link from "next/link";
import { Button } from "@/components/ds";
import { ErrorState } from "@/components/app/ErrorState";
import { PublicShell } from "@/components/public/PublicShell";

export default function CompanyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PublicShell>
      <div className="screen">
        <ErrorState
          title="The register is busy right now"
          body="Companies House limits how quickly company records can be fetched, and we've reached that limit for the moment. Trying again in a minute or two usually works."
          actions={
            <>
              <Button variant="primary" iconRight="arrowRight" onClick={() => reset()}>
                Try again
              </Button>
              <Button href="/search" variant="secondary">
                Search companies
              </Button>
            </>
          }
          links={
            <>
              <Link href="/industry">Industries</Link>
              <Link href="/market">Markets</Link>
              <Link href="/city">Cities</Link>
              <Link href="/sources">Sources &amp; methodology</Link>
            </>
          }
        />
      </div>
    </PublicShell>
  );
}
