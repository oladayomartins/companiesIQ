// PUBLIC search funnel. Search itself is open to everyone — the company
// profiles it links to are the indexable SEO surface (also reachable from
// /industry and /city), so hiding results from anonymous visitors would just
// break the Google → search → profile journey. Instead we tier the DEPTH:
//   anonymous → top 3 results, rest blurred behind a "create free account" CTA
//   free      → top 8, rest blurred behind Go-Pro
//   Pro       → everything.
// noindex (thin/duplicate query pages); the full search tool lives in /app.
import type { Metadata } from "next";
import Link from "next/link";
import { search, type EnrichedResult } from "@/lib/data";
import { getCurrentUser } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { Button, Icon, StatusPill, CompanyAvatar } from "@/components/ds";
import { fmtDate } from "@/lib/format";
import { PublicShell } from "@/components/public/PublicShell";
import { SearchBox } from "@/components/public/SearchBox";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

const ANON_VISIBLE = 3;
const FREE_VISIBLE = 8;

function ResultRow({ c, link }: { c: EnrichedResult; link?: boolean }) {
  const inner = (
    <>
      <CompanyAvatar name={c.name} size="sm" />
      <div className="search-row__main">
        <div className="search-row__name">{c.name}</div>
        <div className="search-row__no mono">
          {c.number}
          {c.region ? ` · ${c.region}` : ""}
        </div>
      </div>
      <span className="search-row__sector">{c.classification?.sector ?? "—"}</span>
      <span className="search-row__date mono">{c.incorporated ? fmtDate(c.incorporated) : "—"}</span>
      <StatusPill status={c.status} />
    </>
  );
  return link ? (
    <Link href={`/company/${c.number}`} className="search-row" style={{ textDecoration: "none" }}>
      {inner}
    </Link>
  ) : (
    <div className="search-row">{inner}</div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const user = await getCurrentUser();
  const signedIn = !!user;
  const subscribed = await hasProAccess(user);

  let results: EnrichedResult[] = [];
  let total = 0;
  if (query) {
    try {
      const r = await search(query);
      results = r.results.slice(0, 12);
      total = r.total;
    } catch {
      results = [];
    }
  }

  const visibleCount = subscribed ? results.length : signedIn ? FREE_VISIBLE : ANON_VISIBLE;
  const visible = results.slice(0, visibleCount);
  const hidden = results.slice(visibleCount);
  const next = encodeURIComponent(`/search?q=${encodeURIComponent(query)}`);
  const totalLabel = total.toLocaleString("en-GB");

  // Conversion copy for the blurred tail — anonymous gets the free-account ask,
  // free accounts get the Pro ask.
  const lock = signedIn
    ? {
        title: `Go Pro to see all ${totalLabel} results`,
        sub: `Your free account previews the first ${FREE_VISIBLE}. Upgrade for the full result set, filters, exports and alerts.`,
        cta: "Go Pro",
        href: "/app/upgrade",
      }
    : {
        title: `Create a free account to see all ${totalLabel} results`,
        sub: `You're previewing the top ${ANON_VISIBLE} — every profile above is free to open. Sign up free to search deeper, then upgrade for exports and alerts.`,
        cta: "Create free account",
        href: `/sign-in?next=${next}`,
      };

  return (
    <PublicShell>
      <div className="screen">
        <div className="screen-head">
          <div>
            <div className="app-eyebrow">Search the UK register</div>
            <h1 className="screen-title">{query ? `Results for “${query}”` : "Search companies"}</h1>
          </div>
        </div>
        <div style={{ maxWidth: 560, marginBottom: 26 }}>
          <SearchBox initial={query} />
        </div>

        {!query ? (
          <p className="public-lede">Try “fintech London”, “care companies Manchester”, or a company name.</p>
        ) : results.length === 0 ? (
          <p className="public-lede">No matches for “{query}”. Try a different term.</p>
        ) : (
          <>
            <p className="search-meta mono">
              {hidden.length && !subscribed
                ? `Showing ${visible.length} of ${totalLabel} — company profiles are free to open`
                : `${totalLabel} ${total === 1 ? "company" : "companies"} match`}
            </p>
            <div className="search-list">
              {visible.map((c) => (
                <ResultRow key={c.number} c={c} link />
              ))}
              {hidden.length && !subscribed ? (
                <div className="search-lock">
                  <div className="search-lock__blur" aria-hidden="true">
                    {hidden.slice(0, 6).map((c) => (
                      <ResultRow key={c.number} c={c} />
                    ))}
                  </div>
                  <div className="search-lock__overlay">
                    <span className="search-lock__icon">
                      <Icon name="shield" size={22} />
                    </span>
                    <div className="search-lock__title">{lock.title}</div>
                    <p className="search-lock__sub">{lock.sub}</p>
                    <Link href={lock.href}>
                      <Button variant="primary" iconRight="arrowRight">
                        {lock.cta}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </PublicShell>
  );
}
