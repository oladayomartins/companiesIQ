"use client";
// The search experience — one surface for everyone.
//
//   no query  → a landing that gives you somewhere to go: what your words will
//               mean ("Read as"), what is new this month, the sectors by size,
//               and your saved searches
//   results   → refine rail with counts IN THE MATCHES, sort, the register
//               table scored for your lens, and bulk actions on selection
//   nothing   → a real empty state that widens the search instead of shrugging
//
// Access is tiered by depth, not by findability: anonymous sees the top few
// rows and every company profile stays free to open; signing in goes deeper;
// Pro removes the cap and turns on filters, export, lists and saved searches.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Icon, Badge, StatusPill, CompanyAvatar, Card, CardBody } from "@/components/ds";
import { fmtDate } from "@/lib/format";
import { toCSV, downloadCSV } from "@/lib/csv";
import { toast } from "@/lib/toast";
import { readQuery, CHIP_LABEL, type QueryChip } from "@/lib/search-parse";
import { slugify } from "@/lib/slug";
import { LENSES, lensForProfile, scorePeerLite } from "@/lib/lens";
import { LensBar, useLensProfile } from "@/components/app/LensBar";
import type { SearchResult } from "@/lib/types";

export interface SavedSearch {
  id: string;
  label: string | null;
  query: { q?: string; sector?: string; region?: string; place?: string; status?: string[]; incorporated?: string };
  created_at: string;
}

export interface SectorTile {
  name: string;
  count: number;
  formatted: string;
}

export interface Tier {
  signedIn: boolean;
  pro: boolean;
  canSaveSearches: boolean;
}

const ANON_VISIBLE = 3;
const FREE_VISIBLE = 8;

const MODES = [
  { id: "companies", label: "Companies", tag: "" },
  { id: "sectors", label: "Sectors & SIC", tag: "" },
  { id: "lists", label: "Saved searches", tag: "Pro" },
] as const;

const AGE_BANDS = [
  { id: "30d", label: "Last 30 days", max: 30 },
  { id: "12m", label: "Last 12 months", max: 365 },
  { id: "5y", label: "1–5 years", max: 1826, min: 366 },
  { id: "old", label: "5+ years", min: 1827 },
] as const;

const SCORE_BANDS = [
  { id: "high", label: "70 and above", test: (n: number) => n >= 70 },
  { id: "mid", label: "40–69", test: (n: number) => n >= 40 && n < 70 },
  { id: "low", label: "Under 40", test: (n: number) => n < 40 },
] as const;

const num = (n: number) => n.toLocaleString("en-GB");
const DAY = 86_400_000;
const ageDays = (iso?: string) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / DAY) : null);
const ageLabel = (iso?: string) => {
  const d = ageDays(iso);
  if (d == null) return "—";
  if (d < 365) return d < 31 ? `${Math.max(d, 0)} days` : `${Math.floor(d / 30.44)} months`;
  const y = Math.floor(d / 365.25);
  return `${y} year${y === 1 ? "" : "s"}`;
};

type Filters = {
  status: string[];
  age: string[];
  region: string[];
  score: string[];
};
const EMPTY_FILTERS: Filters = { status: [], age: [], region: [], score: [] };

/** Filters that must be applied by the API, not to a fetched page. Pro only. */
type Adv = {
  accountsOverdue: boolean;
  confirmationDue: boolean;
  hasAccounts: boolean;
  nationality: string;
  sic: string;
  minTurnover: string;
  minNetWorth: string;
};
const EMPTY_ADV: Adv = {
  accountsOverdue: false,
  confirmationDue: false,
  hasAccounts: false,
  nationality: "",
  sic: "",
  minTurnover: "",
  minNetWorth: "",
};
const advCount = (a: Adv) =>
  [a.accountsOverdue, a.confirmationDue, a.hasAccounts, !!a.nationality, !!a.sic, !!a.minTurnover, !!a.minNetWorth].filter(
    Boolean
  ).length;

export function SearchExperience({
  initialQuery,
  tier,
  savedLens,
  initialSaved,
  sectors,
  newThisMonth,
}: {
  initialQuery: string;
  tier: Tier;
  savedLens: string | null;
  initialSaved: SavedSearch[];
  sectors: SectorTile[];
  newThisMonth: number | null;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [ran, setRan] = useState(initialQuery); // the query the results belong to
  const [mode, setMode] = useState<string>("companies");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState("score");
  const [rows, setRows] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sampled, setSampled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Server-side filters. These cannot be applied to a fetched page — filing
  // status, owner nationality and financials all need per-company enrichment —
  // so they are parameters of the search itself, and Pro-only both here and in
  // /api/search. Ported from the old /app/companies explorer so converging the
  // two surfaces doesn't cost paying users a capability.
  const [adv, setAdv] = useState<Adv>(EMPTY_ADV);
  const [saved, setSaved] = useState<SavedSearch[]>(initialSaved);
  const [savingSearch, setSavingSearch] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { profileKey, otherText, choose } = useLensProfile(savedLens);
  const lensKey = lensForProfile(profileKey);
  const lens = LENSES[lensKey];

  // What the words mean — shown live, and used to run the search, so the
  // reading on screen is always the reading that executed.
  const reading = useMemo(() => readQuery(q), [q]);
  const ranReading = useMemo(() => readQuery(ran), [ran]);

  const runSearch = useCallback(
    async (query: string, advanced: Adv = EMPTY_ADV) => {
      const r = readQuery(query);
      const sp = new URLSearchParams();
      if (r.name) sp.set("q", r.name);
      else if (query.trim() && !r.sector && !r.region && !r.place) sp.set("q", query.trim());
      if (r.sector) sp.set("sector", r.sector);
      if (r.region) sp.set("region", r.region);
      if (r.place) sp.set("location", r.place);
      for (const s of r.status) sp.append("status", s);
      if (advanced.accountsOverdue) sp.set("accountsOverdue", "1");
      if (advanced.confirmationDue) sp.set("confirmationDue", "1");
      if (advanced.hasAccounts) sp.set("hasAccounts", "1");
      if (advanced.nationality) sp.set("nationality", advanced.nationality);
      if (advanced.sic) sp.append("sic", advanced.sic);
      if (advanced.minTurnover) sp.set("minTurnover", advanced.minTurnover);
      if (advanced.minNetWorth) sp.set("minNetWorth", advanced.minNetWorth);

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?${sp.toString()}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { total: number; results: SearchResult[] };
        setRows(data.results ?? []);
        setTotal(data.total ?? 0);
        // Sector, region and town are narrowed by us AFTER Companies House
        // returns a page, so the count is "matches in the sample", not a
        // register-wide total. Say which one the number is.
        setSampled(!!(r.sector || r.region || r.place));
      } catch {
        setRows([]);
        setTotal(0);
        setError("The register didn’t answer just then. Try that search again in a moment.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialQuery.trim()) void runSearch(initialQuery);
    // Only on mount — later runs go through submit().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advanced filters change the QUERY, so they re-run it rather than filtering
  // what is already on screen.
  function applyAdv(nextAdv: Adv) {
    setAdv(nextAdv);
    setSelected(new Set());
    if (ran) void runSearch(ran, nextAdv);
  }

  function submit(next?: string) {
    const query = (next ?? q).trim();
    setQ(query);
    setRan(query);
    setSelected(new Set());
    setFilters(EMPTY_FILTERS);
    // Keep the URL shareable and the page crawlable at its canonical address.
    router.replace(query ? `/search?q=${encodeURIComponent(query)}` : "/search", { scroll: false });
    setAdv(EMPTY_ADV);
    if (query) void runSearch(query, EMPTY_ADV);
    else {
      setRows([]);
      setTotal(0);
    }
  }

  // ---- Scoring + filtering ---------------------------------------------------

  const scored = useMemo(
    () =>
      rows.map((r) => {
        const { score, signal } = scorePeerLite({ status: r.status, incorporated: r.incorporated }, lensKey);
        return { ...r, score, signal };
      }),
    [rows, lensKey]
  );

  const matches = (r: (typeof scored)[number], f: Filters) => {
    if (f.status.length && !f.status.includes(r.status.toLowerCase())) return false;
    if (f.region.length && !f.region.includes(r.region ?? "Unknown")) return false;
    if (f.score.length && !f.score.some((id) => SCORE_BANDS.find((b) => b.id === id)?.test(r.score))) return false;
    if (f.age.length) {
      const d = ageDays(r.incorporated);
      if (d == null) return false;
      const ok = f.age.some((id) => {
        const b = AGE_BANDS.find((x) => x.id === id);
        if (!b) return false;
        if ("min" in b && b.min != null && d < b.min) return false;
        if ("max" in b && b.max != null && d > b.max) return false;
        return true;
      });
      if (!ok) return false;
    }
    return true;
  };

  const filtered = useMemo(() => scored.filter((r) => matches(r, filters)), [scored, filters]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === "score") list.sort((a, b) => b.score - a.score);
    else if (sort === "new") list.sort((a, b) => (b.incorporated ?? "").localeCompare(a.incorporated ?? ""));
    else list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [filtered, sort]);

  // Facet counts are computed over the fetched page with the OTHER facets
  // applied — so a count always says "how many more would this add", never a
  // number from a register-wide aggregate we cannot actually run.
  const facetCount = useCallback(
    (group: keyof Filters, id: string) => {
      const probe: Filters = { ...filters, [group]: [id] };
      return scored.filter((r) => matches(r, probe)).length;
    },
    [scored, filters]
  );

  const toggle = (group: keyof Filters, id: string) => {
    setFilters((f) => ({
      ...f,
      [group]: f[group].includes(id) ? f[group].filter((x) => x !== id) : [...f[group], id],
    }));
  };
  const activeChips = useMemo(
    () =>
      (Object.keys(filters) as (keyof Filters)[]).flatMap((g) =>
        filters[g].map((id) => ({ group: g, id, label: labelFor(g, id) }))
      ),
    [filters]
  );
  const filterCount = activeChips.length;

  const regionsInResults = useMemo(() => {
    const by = new Map<string, number>();
    for (const r of scored) {
      const k = r.region ?? "Unknown";
      by.set(k, (by.get(k) ?? 0) + 1);
    }
    return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [scored]);

  // ---- Tiering ---------------------------------------------------------------

  const visibleCount = tier.pro ? sorted.length : tier.signedIn ? FREE_VISIBLE : ANON_VISIBLE;
  const visible = sorted.slice(0, visibleCount);
  const hidden = sorted.slice(visibleCount);
  const next = encodeURIComponent(`/search${ran ? `?q=${encodeURIComponent(ran)}` : ""}`);

  // ---- Bulk actions ----------------------------------------------------------

  const selectedRows = useMemo(() => visible.filter((r) => selected.has(r.number)), [visible, selected]);

  function toggleRow(number: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(number)) n.delete(number);
      else n.add(number);
      return n;
    });
  }

  function exportSelected() {
    const list = selectedRows.length ? selectedRows : visible;
    downloadCSV(
      `companiesiq-search-${Date.now()}.csv`,
      toCSV(
        ["Company", "Number", "Status", "Incorporated", "Region", `${lens.short} signal`, "Score"],
        list.map((r) => [r.name, r.number, r.status, r.incorporated ?? "", r.region ?? "", r.signal, r.score])
      )
    );
    toast(`Exported ${list.length} ${list.length === 1 ? "company" : "companies"} to CSV`, { tone: "info" });
  }

  async function saveSearch() {
    setSavingSearch(true);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: describeSearch(ranReading.chips, ran),
          query: {
            q: ran,
            sector: ranReading.sector,
            region: ranReading.region,
            place: ranReading.place,
            status: ranReading.status,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "failed");
      setSaved((s) => [data.search as SavedSearch, ...s]);
      toast("Search saved", { tone: "info" });
    } catch {
      toast("Couldn’t save that search", { tone: "error" });
    } finally {
      setSavingSearch(false);
    }
  }

  async function removeSaved(id: string) {
    setSaved((s) => s.filter((x) => x.id !== id));
    await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  // ---- Pieces ----------------------------------------------------------------

  const searchBox = (
    <form
      className="sx-box"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Icon name="search" size={18} />
      <input
        ref={inputRef}
        aria-label="Search UK companies"
        placeholder="Search 5.5m UK companies, people or sectors…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q ? (
        <button type="button" className="sx-box__clear" aria-label="Clear search" onClick={() => submit("")}>
          <Icon name="x" size={15} />
        </button>
      ) : null}
      <Button variant="primary" type="submit">
        Search
      </Button>
    </form>
  );

  const readAs = reading.chips.length ? (
    <div className="sx-readas">
      <span className="sx-readas__k mono">Read as</span>
      {reading.chips.map((c: QueryChip) => (
        <span className={`sx-chip is-${c.kind}`} key={`${c.kind}:${c.value}`}>
          {c.value}
          <span className="sx-chip__kind mono">{CHIP_LABEL[c.kind]}</span>
        </span>
      ))}
    </div>
  ) : null;

  const modes = (
    <div className="sx-modes" role="tablist" aria-label="Search mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={mode === m.id}
          className={`sx-mode${mode === m.id ? " is-on" : ""}`}
          onClick={() => setMode(m.id)}
        >
          {m.label}
          {m.tag ? <span className="sx-mode__tag mono">{m.tag}</span> : null}
        </button>
      ))}
    </div>
  );

  // ---- Landing ---------------------------------------------------------------

  if (!ran) {
    return (
      <div className="sx">
        <div className="sx-hero">
          <div className="app-eyebrow">Search the UK register</div>
          <h1 className="sx-hero__title">Find the companies worth your time</h1>
          <p className="sx-hero__lede">
            5.5m UK companies from Companies House, scored for {lens.label.toLowerCase()}. Type a name, a sector, a
            place — or all three.
          </p>
          {modes}
          {mode === "companies" ? (
            <>
              {searchBox}
              {readAs}
              <div className="sx-try">
                <span className="sx-try__k mono">Try</span>
                {["digit", "care companies Manchester", "motor trade South East", "fintech London"].map((e) => (
                  <button key={e} className="sx-try__btn" onClick={() => submit(e)}>
                    {e}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {mode === "sectors" ? (
            <p className="sx-hero__lede" style={{ marginTop: 0 }}>
              Browse the register by what companies do. Every sector has its own page with formations, survival rates
              and the newest registrations.
            </p>
          ) : null}
          {mode === "lists" ? (
            <p className="sx-hero__lede" style={{ marginTop: 0 }}>
              {tier.canSaveSearches
                ? "Your saved searches are below — open one to pick up where you left off."
                : "Saving a search keeps its filters and tells you what is new since you last looked. Available on Pro."}
            </p>
          ) : null}
        </div>

        <div className="sx-landing">
          {newThisMonth != null ? (
            <Card>
              <CardBody>
                <span className="app-eyebrow">New this month</span>
                <div className="sx-big">{num(newThisMonth)}</div>
                <p className="sx-land__note">
                  Companies incorporated in the last 30 days — the freshest, least-contacted end of the register.
                </p>
                <Link className="icard__cta" href="/signals">
                  Browse new incorporations <Icon name="arrowRight" size={13} />
                </Link>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardBody>
              <span className="app-eyebrow">Browse by sector</span>
              <div className="sx-sectors">
                {sectors.map((s) => (
                  <Link className="sx-sector" key={s.name} href={`/industry/${slugify(s.name)}`}>
                    <span className="sx-sector__name">{s.name}</span>
                    <span className="sx-sector__n mono">{s.formatted}</span>
                  </Link>
                ))}
              </div>
              <Link className="icard__cta" href="/industry">
                All sector groups <Icon name="arrowRight" size={13} />
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <span className="app-eyebrow">Your saved searches</span>
              {saved.length ? (
                <>
                  <div className="sx-saved">
                    {saved.slice(0, 6).map((s) => (
                      <div className="sx-saved__row" key={s.id}>
                        <button className="sx-saved__open" onClick={() => submit(s.query.q ?? s.label ?? "")}>
                          {s.label || s.query.q || "Saved search"}
                        </button>
                        <button className="sx-saved__x" aria-label="Remove saved search" onClick={() => removeSaved(s.id)}>
                          <Icon name="x" size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Link className="icard__cta" href="/app/alerts">
                    Manage saved searches &amp; alerts <Icon name="arrowRight" size={13} />
                  </Link>
                </>
              ) : (
                <>
                  <p className="sx-land__note">
                    {tier.canSaveSearches
                      ? "Nothing saved yet. Run a search and choose “Save this search” to keep its filters."
                      : "Save a search to keep its filters and see what is new since you last looked."}
                  </p>
                  <Link className="icard__cta" href={tier.signedIn ? "/app/upgrade" : "/pricing"}>
                    {tier.canSaveSearches ? "Set up alerts" : "See plans"} <Icon name="arrowRight" size={13} />
                  </Link>
                </>
              )}
            </CardBody>
          </Card>
        </div>

        <p className="sx-attrib">
          Public business data from Companies House, reused under the Open Government Licence, combined with ONS sector
          data. Scores are indicative and re-weight with the lens you choose.
        </p>
      </div>
    );
  }

  // ---- Results ---------------------------------------------------------------

  const noResults = !loading && !error && sorted.length === 0;

  const refine = (
    <aside className="sx-refine">
      <div className="sx-refine__head">
        <span className="app-eyebrow">Refine</span>
        <span className="sx-refine__note mono">counts in matches</span>
      </div>
      {filterCount ? (
        <button className="sx-refine__clear" onClick={() => setFilters(EMPTY_FILTERS)}>
          Clear all
        </button>
      ) : null}

      <FacetGroup
        label="Status"
        options={[
          { id: "active", label: "Active" },
          { id: "dissolved", label: "Dissolved" },
          { id: "liquidation", label: "Liquidation" },
          { id: "dormant", label: "Dormant" },
        ]}
        selected={filters.status}
        count={(id) => facetCount("status", id)}
        onToggle={(id) => toggle("status", id)}
      />
      <FacetGroup
        label="Incorporated"
        options={AGE_BANDS.map((b) => ({ id: b.id, label: b.label }))}
        selected={filters.age}
        count={(id) => facetCount("age", id)}
        onToggle={(id) => toggle("age", id)}
      />
      {regionsInResults.length > 1 ? (
        <FacetGroup
          label="Region"
          options={regionsInResults.map(([r]) => ({ id: r, label: r }))}
          selected={filters.region}
          count={(id) => facetCount("region", id)}
          onToggle={(id) => toggle("region", id)}
        />
      ) : null}
      <FacetGroup
        label={`${lens.short} score`}
        options={SCORE_BANDS.map((b) => ({ id: b.id, label: b.label }))}
        selected={filters.score}
        count={(id) => facetCount("score", id)}
        onToggle={(id) => toggle("score", id)}
      />

      {!tier.pro ? (
        <div className="sx-refine__gate">
          <div className="sx-refine__gateTitle">More filters on Pro</div>
          <p className="sx-refine__gateSub">
            Filing status, owner nationality, SIC code, company type, turnover and net assets — plus the whole result
            set instead of the first page.
          </p>
          <Link href={tier.signedIn ? "/app/upgrade" : "/pricing"}>
            <Button variant="secondary" iconRight="arrowRight">
              See plans
            </Button>
          </Link>
        </div>
      ) : (
        <div className="sx-facet sx-facet--adv">
          <div className="sx-facet__label mono">
            Advanced
            {advCount(adv) ? <span className="sx-facet__advN">{advCount(adv)}</span> : null}
          </div>
          <p className="sx-facet__advNote">These re-run the search — they need filing and accounts data per company.</p>

          <label className="sx-check">
            <input
              type="checkbox"
              checked={adv.accountsOverdue}
              onChange={(e) => applyAdv({ ...adv, accountsOverdue: e.target.checked })}
            />
            Accounts overdue
          </label>
          <label className="sx-check">
            <input
              type="checkbox"
              checked={adv.confirmationDue}
              onChange={(e) => applyAdv({ ...adv, confirmationDue: e.target.checked })}
            />
            Confirmation statement due
          </label>
          <label className="sx-check">
            <input
              type="checkbox"
              checked={adv.hasAccounts}
              onChange={(e) => applyAdv({ ...adv, hasAccounts: e.target.checked })}
            />
            Has filed accounts
          </label>

          <input
            className="sx-input"
            placeholder="SIC code (e.g. 62020)"
            value={adv.sic}
            onChange={(e) => setAdv({ ...adv, sic: e.target.value })}
            onBlur={() => applyAdv(adv)}
            aria-label="SIC code"
          />
          <input
            className="sx-input"
            placeholder="Owner nationality"
            value={adv.nationality}
            onChange={(e) => setAdv({ ...adv, nationality: e.target.value })}
            onBlur={() => applyAdv(adv)}
            aria-label="Owner nationality"
          />
          <input
            className="sx-input"
            inputMode="numeric"
            placeholder="Min turnover (£)"
            value={adv.minTurnover}
            onChange={(e) => setAdv({ ...adv, minTurnover: e.target.value.replace(/[^0-9]/g, "") })}
            onBlur={() => applyAdv(adv)}
            aria-label="Minimum turnover"
          />
          <input
            className="sx-input"
            inputMode="numeric"
            placeholder="Min net assets (£)"
            value={adv.minNetWorth}
            onChange={(e) => setAdv({ ...adv, minNetWorth: e.target.value.replace(/[^0-9]/g, "") })}
            onBlur={() => applyAdv(adv)}
            aria-label="Minimum net assets"
          />

          {advCount(adv) ? (
            <button className="sx-refine__clear" onClick={() => applyAdv(EMPTY_ADV)}>
              Clear advanced
            </button>
          ) : null}
        </div>
      )}
    </aside>
  );

  return (
    <div className="sx sx--results">
      <div className="sx-searchrow">
        {searchBox}
        {readAs}
      </div>

      <div className="sx-layout">
        {refine}

        <div className="sx-main">
          <div className="sx-head">
            <div className="sx-head__count">
              <span className="sx-head__noun mono">{loading ? "Searching" : "Companies"} for</span>
              <span className="sx-head__q">“{ran}”</span>
              {!loading ? (
                <span className="sx-head__n mono">
                  {sampled
                    ? `${num(total)} matched in the latest register sample`
                    : `${num(total)} on the register`}
                </span>
              ) : null}
            </div>
            <div className="sx-head__tools">
              <LensBar
                variant="compact"
                profileKey={profileKey}
                otherText={otherText}
                onChoose={choose}
                savedDefault={savedLens}
                canSave={tier.pro}
                signedIn={tier.signedIn}
              />
              <label className="sx-sort">
                <span className="mono">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
                  <option value="score">{lens.short} score</option>
                  <option value="new">Newest first</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>
          </div>

          {activeChips.length ? (
            <div className="sx-chips">
              {activeChips.map((c) => (
                <button className="sx-chip is-filter" key={`${c.group}:${c.id}`} onClick={() => toggle(c.group, c.id)}>
                  {c.label}
                  <Icon name="x" size={12} />
                </button>
              ))}
            </div>
          ) : null}

          <div className="sx-actions">
            {tier.canSaveSearches ? (
              <Button variant="secondary" onClick={saveSearch} disabled={savingSearch}>
                {savingSearch ? "Saving…" : "Save this search"}
              </Button>
            ) : (
              <Link href={tier.signedIn ? "/app/upgrade" : "/pricing"}>
                <Button variant="secondary">Save this search</Button>
              </Link>
            )}
            {tier.pro ? (
              <Button variant="secondary" iconLeft="download" onClick={exportSelected}>
                Export CSV
              </Button>
            ) : null}
          </div>

          {error ? <p className="sx-error">{error}</p> : null}

          {loading ? (
            <div className="sx-skeleton" aria-live="polite">
              Searching the register…
            </div>
          ) : noResults ? (
            <NoResults query={ran} filterCount={filterCount} onClear={() => setFilters(EMPTY_FILTERS)} onPick={submit} onNew={() => submit("")} />
          ) : (
            <>
              <div className="sx-table" role="table">
                <div className="sx-tr sx-tr--head" role="row">
                  {tier.pro ? <span className="sx-td sx-td--pick" /> : null}
                  <span className="sx-td">Company</span>
                  <span className="sx-td sx-td--status">Status</span>
                  <span className="sx-td sx-td--inc">Incorporated</span>
                  <span className="sx-td sx-td--signal">{lens.short} signal</span>
                  <span className="sx-td sx-td--score">Score</span>
                </div>

                {visible.map((r) => (
                  <Link className="sx-tr" role="row" key={r.number} href={`/company/${r.number}`}>
                    {tier.pro ? (
                      <span
                        className={`sx-td sx-td--pick${selected.has(r.number) ? " is-on" : ""}`}
                        role="checkbox"
                        aria-checked={selected.has(r.number)}
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleRow(r.number);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleRow(r.number);
                          }
                        }}
                      >
                        <span className="sx-pick" aria-hidden="true">
                          {selected.has(r.number) ? <Icon name="check" size={12} /> : null}
                        </span>
                      </span>
                    ) : null}
                    <span className="sx-td sx-td--name">
                      <CompanyAvatar name={r.name} size="sm" />
                      <span className="sx-name">
                        <span className="sx-name__main">{r.name}</span>
                        <span className="sx-name__meta mono">
                          No. {r.number}
                          {r.classification?.sector ? ` · ${r.classification.sector}` : ""}
                          {r.locality ? ` · ${r.locality}` : ""}
                        </span>
                      </span>
                    </span>
                    <span className="sx-td sx-td--status">
                      <StatusPill status={r.status} />
                    </span>
                    <span className="sx-td sx-td--inc">
                      <span className="sx-inc mono">{r.incorporated ? fmtDate(r.incorporated) : "—"}</span>
                      <span className="sx-inc__age">{ageLabel(r.incorporated)}</span>
                    </span>
                    <span className="sx-td sx-td--signal">{r.signal}</span>
                    <span className="sx-td sx-td--score mono">{r.score}</span>
                  </Link>
                ))}
              </div>

              {hidden.length && !tier.pro ? (
                <div className="search-lock">
                  <div className="search-lock__blur" aria-hidden="true">
                    {hidden.slice(0, 5).map((r) => (
                      <div className="sx-tr" key={r.number}>
                        <span className="sx-td sx-td--name">
                          <CompanyAvatar name={r.name} size="sm" />
                          <span className="sx-name">
                            <span className="sx-name__main">{r.name}</span>
                            <span className="sx-name__meta mono">No. {r.number}</span>
                          </span>
                        </span>
                        <span className="sx-td sx-td--status">
                          <StatusPill status={r.status} />
                        </span>
                        <span className="sx-td sx-td--inc" />
                        <span className="sx-td sx-td--signal">{r.signal}</span>
                        <span className="sx-td sx-td--score mono">{r.score}</span>
                      </div>
                    ))}
                  </div>
                  <div className="search-lock__overlay">
                    <span className="search-lock__icon">
                      <Icon name="shield" size={22} />
                    </span>
                    <div className="search-lock__title">
                      {tier.signedIn
                        ? `Go Pro to see all ${num(sorted.length)} matches`
                        : `Create a free account to see all ${num(sorted.length)} matches`}
                    </div>
                    <p className="search-lock__sub">
                      {tier.signedIn
                        ? `Your free account previews the first ${FREE_VISIBLE}. Pro adds the full set, filters, sorting, exports and saved searches.`
                        : `You're previewing the top ${ANON_VISIBLE} — every profile above is free to open. Sign up free to search deeper.`}
                    </p>
                    <Link href={tier.signedIn ? "/app/upgrade" : `/sign-in?next=${next}`}>
                      <Button variant="primary" iconRight="arrowRight">
                        {tier.signedIn ? "Go Pro" : "Create free account"}
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="sx-foot mono">
                <span>
                  Showing {visible.length} of {num(sorted.length)}
                  {filterCount ? ` (refined from ${scored.length})` : ""}
                  {sampled
                    ? " · sector, region and town are matched across a live register sample, so this is not a full count"
                    : ` · ${num(total)} match on the register`}
                </span>
                <span>Live from Companies House</span>
              </div>
            </>
          )}
        </div>
      </div>

      {tier.pro && selected.size ? (
        <div className="sx-selbar">
          <span className="sx-selbar__n">{selected.size} selected</span>
          <span className="sx-selbar__lens mono">Scored for {lens.label}</span>
          <div className="sx-selbar__actions">
            <Button variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="secondary" iconLeft="download" onClick={exportSelected}>
              Export CSV
            </Button>
            <Link href="/app/prospects">
              <Button variant="primary" iconRight="arrowRight">
                Add to prospect list
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---- Sub-components ---------------------------------------------------------

function FacetGroup({
  label,
  options,
  selected,
  count,
  onToggle,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  count: (id: string) => number;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="sx-facet">
      <div className="sx-facet__label mono">{label}</div>
      {options.map((o) => {
        const n = count(o.id);
        const on = selected.includes(o.id);
        // A facet that would empty the results is shown disabled rather than
        // hidden — "0" is information, a vanishing option is confusing.
        return (
          <button
            key={o.id}
            className={`sx-facet__opt${on ? " is-on" : ""}${n === 0 && !on ? " is-empty" : ""}`}
            disabled={n === 0 && !on}
            onClick={() => onToggle(o.id)}
          >
            <span className="sx-facet__mark" aria-hidden="true">
              {on ? <Icon name="check" size={11} /> : null}
            </span>
            <span className="sx-facet__name">{o.label}</span>
            <span className="sx-facet__n mono">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

function NoResults({
  query,
  filterCount,
  onClear,
  onPick,
  onNew,
}: {
  query: string;
  filterCount: number;
  onClear: () => void;
  onPick: (q: string) => void;
  onNew: () => void;
}) {
  const suggestions = [
    ["digit", "1,014"],
    ["care companies Manchester", "318"],
    ["motor trade South East", "7,213"],
    ["fintech London", "2,480"],
  ];
  return (
    <div className="sx-empty">
      <div className="sx-empty__title">No companies match “{query}”</div>
      <p className="sx-empty__sub">
        We searched on name, sector, SIC code and registered address
        {filterCount ? " with your current filters applied" : ""}. Nothing came back.
      </p>

      <div className="sx-empty__block">
        <div className="sx-empty__k mono">Widen the search</div>
        <div className="sx-empty__row">
          {filterCount ? (
            <Button variant="secondary" onClick={onClear}>
              Remove all {filterCount} filter{filterCount === 1 ? "" : "s"}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onNew}>
            Start a new search
          </Button>
        </div>
      </div>

      <div className="sx-empty__block">
        <div className="sx-empty__k mono">Searches that do return results</div>
        <div className="sx-empty__row">
          {suggestions.map(([label]) => (
            <button className="sx-try__btn" key={label} onClick={() => onPick(label)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Helpers ----------------------------------------------------------------

function labelFor(group: keyof Filters, id: string): string {
  if (group === "age") return AGE_BANDS.find((b) => b.id === id)?.label ?? id;
  if (group === "score") return SCORE_BANDS.find((b) => b.id === id)?.label ?? id;
  if (group === "status") return id.charAt(0).toUpperCase() + id.slice(1);
  return id;
}

/** A saved search needs a name a human recognises a month later. */
function describeSearch(chips: QueryChip[], fallback: string): string {
  if (!chips.length) return fallback;
  return chips.map((c) => c.value).join(" · ");
}
