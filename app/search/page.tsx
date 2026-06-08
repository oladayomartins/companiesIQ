// PUBLIC search funnel. Anonymous → results blurred behind a Sign-in CTA;
// free (signed in) → top 3 visible, rest blurred behind Go-Pro; Pro → full.
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

const FREE_VISIBLE = 3;

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

  const visibleCount = subscribed ? results.length : signedIn ? FREE_VISIBLE : 0;
  const visible = results.slice(0, visibleCount);
  const hidden = results.slice(visibleCount);
  const next = encodeURIComponent(`/search?q=${encodeURIComponent(query)}`);

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
                  <div className="search-lock__title">
                    {signedIn
                      ? `Go Pro to see all ${total.toLocaleString("en-GB")} results`
                      : "Sign in to see your results"}
                  </div>
                  <p className="search-lock__sub">
                    {signedIn
                      ? "Your free account previews the top 3. Upgrade for the full result set, filters, exports and alerts."
                      : "Create a free account to preview results — then upgrade to Pro for the full set, exports and alerts."}
                  </p>
                  <Link href={signedIn ? "/app/upgrade" : `/sign-in?next=${next}`}>
                    <Button variant="primary" iconRight="arrowRight">
                      {signedIn ? "Go Pro" : "Sign in to view"}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
