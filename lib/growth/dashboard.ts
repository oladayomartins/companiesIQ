// ============================================================
// Revenue screen data (server-only, admin-gated by the caller).
//
// Everything here is first-party: Stripe for money, Supabase for the funnel.
// No GA4 — so no bot traffic, no blocked tags, no USD reporting currency.
// ============================================================
import "server-only";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { planForPriceId } from "@/lib/subscriptions";
import { planById, type PlanId } from "@/lib/subscription";
import { assess, openCheckout, TEMPLATE_LABELS, type Template } from "@/lib/growth/playbook";
import { getMode, GrowthSetupError, loadAccounts, type AutopilotMode, type RunResult } from "@/lib/growth/engine";
import { bucketBy, classifyQuery, findOpportunities, pageTemplate, type Bucket, type GscRow, type Opportunity } from "@/lib/growth/search-console";
import { SEARCH_INTENT_LABELS, type SearchIntent } from "@/lib/growth/intent";

const DAY = 86_400_000;
const CONVERSION_WINDOW = 7 * DAY; // an email "converted" if they paid within 7 days of it

export interface FunnelStep {
  label: string;
  count: number;
  hint: string;
}

export interface LeadRow {
  email: string;
  score: number;
  tier: "hot" | "warm" | "cold";
  stage: string;
  signals: string[];
  next: string | null;
  signedUp: string;
}

export interface AbandonedRow {
  email: string;
  plan: string;
  billing: string;
  startedAt: string;
  recovery: "sent" | "queued" | "none";
}

export interface EmailRow {
  email: string;
  template: string;
  status: string;
  at: string;
  converted: boolean;
}

export interface TemplateStat {
  template: string;
  label: string;
  sent: number;
  converted: number;
}

/** A row of the "where signups come from" tables. */
export interface SourceRow {
  label: string;
  signups: number;
  engaged: number;
  checkout: number;
  paid: number;
}

export interface OnSiteDemand {
  byIntent: { intent: SearchIntent; label: string; searches: number; users: number; capped: number }[];
  topQueries: { q: string; intent: SearchIntent; searches: number; users: number }[];
}

export interface SearchDemand {
  importedAt: { pages: string | null; queries: string | null };
  totals: { clicks: number; impressions: number; ctr: number } | null;
  pageTemplates: Bucket[];
  intents: Bucket[];
  pageOpportunities: Opportunity[];
  queryOpportunities: Opportunity[];
}

export interface RevenueDashboard {
  setupError: string | null;
  windowDays: number;
  mode: AutopilotMode;
  lastRunAt: string | null;
  lastRun: (RunResult & { trigger?: string }) | null;
  money: { mrr: number; customers: number; source: "stripe" | "estimate"; collected: number; recovered: number };
  funnel: FunnelStep[];
  abandoned: AbandonedRow[];
  leads: LeadRow[];
  emails: EmailRow[];
  templates: TemplateStat[];
  search: SearchDemand;
  sources: { byChannel: SourceRow[]; byLanding: SourceRow[]; recorded: number };
  onSite: OnSiteDemand;
}

async function stripeMrr(): Promise<{ mrr: number; customers: number } | null> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    const stripe = new Stripe(key);
    let mrr = 0;
    const customers = new Set<string>();
    for await (const sub of stripe.subscriptions.list({ status: "active", limit: 100 })) {
      for (const item of sub.items.data) {
        // Only CompaniesIQ plans — the Stripe account also sells DigitWarehouse packages.
        if (!planForPriceId(item.price.id)) continue;
        const unit = (item.price.unit_amount ?? 0) / 100;
        const rec = item.price.recurring;
        const perMonth = rec?.interval === "year" ? unit / 12 : rec?.interval === "week" ? unit * 4.33 : unit;
        mrr += (perMonth / (rec?.interval_count || 1)) * (item.quantity ?? 1);
        customers.add(typeof sub.customer === "string" ? sub.customer : sub.customer.id);
      }
    }
    return { mrr: Math.round(mrr * 100) / 100, customers: customers.size };
  } catch {
    return null;
  }
}

function emptySearch(): SearchDemand {
  return { importedAt: { pages: null, queries: null }, totals: null, pageTemplates: [], intents: [], pageOpportunities: [], queryOpportunities: [] };
}

async function loadSearch(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<SearchDemand> {
  const latest = async (kind: "pages" | "queries") => {
    const { data } = await admin
      .from("search_console_imports")
      .select("rows,imported_at")
      .eq("kind", kind)
      .order("imported_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data as { rows: GscRow[]; imported_at: string } | null;
  };
  const [pages, queries] = await Promise.all([latest("pages"), latest("queries")]);
  const out = emptySearch();
  out.importedAt = { pages: pages?.imported_at ?? null, queries: queries?.imported_at ?? null };
  if (pages?.rows?.length) {
    const clicks = pages.rows.reduce((s, r) => s + r.clicks, 0);
    const impressions = pages.rows.reduce((s, r) => s + r.impressions, 0);
    out.totals = { clicks, impressions, ctr: impressions ? clicks / impressions : 0 };
    out.pageTemplates = bucketBy(pages.rows, (r) => pageTemplate(r.key)).slice(0, 12);
    out.pageOpportunities = findOpportunities(pages.rows, false, 20);
  }
  if (queries?.rows?.length) {
    out.intents = bucketBy(queries.rows, (r) => classifyQuery(r.key));
    out.queryOpportunities = findOpportunities(queries.rows, true, 25);
  }
  return out;
}

export async function loadRevenueDashboard(windowDays = 30): Promise<RevenueDashboard> {
  const now = Date.now();
  const since = now - windowDays * DAY;
  const base: RevenueDashboard = {
    setupError: null,
    windowDays,
    mode: "dry_run",
    lastRunAt: null,
    lastRun: null,
    money: { mrr: 0, customers: 0, source: "estimate", collected: 0, recovered: 0 },
    funnel: [],
    abandoned: [],
    leads: [],
    emails: [],
    templates: [],
    search: emptySearch(),
    sources: { byChannel: [], byLanding: [], recorded: 0 },
    onSite: { byIntent: [], topQueries: [] },
  };

  const admin = getSupabaseAdmin();
  if (!admin) return { ...base, setupError: "Supabase service role isn't configured (SUPABASE_SERVICE_ROLE_KEY)." };

  try {
    const [mode, settings, accounts, emailRows, mrr, search] = await Promise.all([
      getMode(admin),
      admin.from("growth_settings").select("last_run_at,last_run").eq("id", 1).maybeSingle(),
      loadAccounts(admin, now),
      admin.from("growth_emails").select("user_id,email,template,status,created_at").order("created_at", { ascending: false }).limit(300),
      stripeMrr(),
      loadSearch(admin),
    ]);
    if (emailRows.error) throw new GrowthSetupError(emailRows.error.message);

    const people = accounts.filter((a) => !a.comped);
    const inWindow = (t: number) => t >= since;
    const has = (a: (typeof people)[number], names: string[]) => a.events.some((e) => names.includes(e.event) && inWindow(e.at));

    // ---- Money ----
    const completions = people.flatMap((a) => a.events.filter((e) => e.event === "checkout_completed").map((e) => ({ a, e })));
    const paidAt = new Map<string, number[]>();
    for (const { a, e } of completions) (paidAt.get(a.userId) ?? paidAt.set(a.userId, []).get(a.userId)!).push(e.at);
    const convertedAfter = (userId: string, at: number) => (paidAt.get(userId) ?? []).some((t) => t >= at && t - at <= CONVERSION_WINDOW);

    let collected = 0;
    const { data: valued } = await admin
      .from("growth_events")
      .select("user_id,value,created_at")
      .eq("event", "checkout_completed")
      .gte("created_at", new Date(since).toISOString());
    for (const v of valued ?? []) collected += Number(v.value) || 0;

    const sentMails = (emailRows.data ?? []).filter((m) => m.status === "sent");
    let recovered = 0;
    for (const v of valued ?? []) {
      const t = Date.parse(v.created_at);
      const nudged = sentMails.some((m) => m.user_id === v.user_id && t >= Date.parse(m.created_at) && t - Date.parse(m.created_at) <= CONVERSION_WINDOW);
      if (nudged) recovered += Number(v.value) || 0;
    }

    const paying = people.filter((a) => a.paid);
    base.money = mrr
      ? { mrr: mrr.mrr, customers: mrr.customers, source: "stripe", collected, recovered }
      : {
          mrr: paying.reduce((s, a) => s + (planById(a.plan as PlanId).monthly ?? 0), 0),
          customers: paying.length,
          source: "estimate",
          collected,
          recovered,
        };

    // ---- Funnel (accounts, this window) ----
    const signedUp = people.filter((a) => inWindow(a.signedUpAt));
    base.funnel = [
      { label: "Signed up", count: signedUp.length, hint: "New accounts" },
      {
        label: "Engaged",
        count: people.filter((a) => (a.lastActivityAt && inWindow(a.lastActivityAt)) || a.events.some((e) => inWindow(e.at))).length,
        hint: "Used a feature or hit a gate",
      },
      { label: "Showed intent", count: people.filter((a) => has(a, ["paywall_view", "pricing_view", "upgrade_view", "plan_select"])).length, hint: "Paywall, pricing or plan pick" },
      { label: "Started checkout", count: people.filter((a) => has(a, ["checkout_started"])).length, hint: "Sent to Stripe" },
      { label: "Paid", count: people.filter((a) => has(a, ["checkout_completed"])).length, hint: "Checkout completed" },
    ];

    // ---- Abandoned checkouts ----
    base.abandoned = people
      .filter((a) => !a.paid)
      .map((a) => ({ a, open: openCheckout(a) }))
      .filter(({ open }) => open && inWindow(open.at))
      .map(({ a, open }) => {
        const mailed = a.emails.some((m) => m.template === "checkout_recovery" && m.ref === (open!.ref ?? ""));
        const queued = !mailed && assess(a, now).next?.template === "checkout_recovery";
        return {
          email: a.email,
          plan: open!.plan ?? "—",
          billing: open!.billing ?? "—",
          startedAt: new Date(open!.at).toISOString(),
          recovery: mailed ? ("sent" as const) : queued ? ("queued" as const) : ("none" as const),
        };
      })
      .sort((x, y) => y.startedAt.localeCompare(x.startedAt));

    // ---- Leads ----
    base.leads = people
      .filter((a) => !a.paid)
      .map((a) => {
        const x = assess(a, now);
        return {
          email: a.email,
          score: x.score,
          tier: x.tier,
          stage: x.stage,
          signals: x.signals,
          next: x.next ? `${TEMPLATE_LABELS[x.next.template]} — ${x.next.reason}` : null,
          signedUp: new Date(a.signedUpAt).toISOString(),
        };
      })
      .filter((l) => l.score > 0 || l.next)
      .sort((x, y) => y.score - x.score)
      .slice(0, 40);

    // ---- Emails + per-template conversion ----
    base.emails = (emailRows.data ?? []).slice(0, 60).map((m) => ({
      email: m.email,
      template: TEMPLATE_LABELS[m.template as Template] ?? m.template,
      status: m.status,
      at: m.created_at,
      converted: m.status === "sent" && convertedAfter(m.user_id, Date.parse(m.created_at)),
    }));
    base.templates = (Object.keys(TEMPLATE_LABELS) as Template[]).map((t) => {
      const rows = sentMails.filter((m) => m.template === t);
      return {
        template: t,
        label: TEMPLATE_LABELS[t],
        sent: rows.length,
        converted: rows.filter((m) => convertedAfter(m.user_id, Date.parse(m.created_at))).length,
      };
    });

    // ---- Where signups come from (landing page → signup → revenue) ----
    const cohort = people.filter((a) => inWindow(a.signedUpAt));
    const outcome = (a: (typeof people)[number]) => ({
      engaged: !!(a.lastActivityAt || a.events.length),
      checkout: a.events.some((e) => e.event === "checkout_started"),
      paid: a.paid || a.events.some((e) => e.event === "checkout_completed"),
    });
    const tally = (keyOf: (a: (typeof people)[number]) => string): SourceRow[] => {
      const m = new Map<string, SourceRow>();
      for (const a of cohort) {
        const k = keyOf(a);
        const row = m.get(k) ?? { label: k, signups: 0, engaged: 0, checkout: 0, paid: 0 };
        const o = outcome(a);
        row.signups++;
        if (o.engaged) row.engaged++;
        if (o.checkout) row.checkout++;
        if (o.paid) row.paid++;
        m.set(k, row);
      }
      return [...m.values()].sort((x, y) => y.paid - x.paid || y.signups - x.signups);
    };
    base.sources = {
      byChannel: tally((a) => channelOf(a.attribution)),
      byLanding: tally((a) => (a.attribution.landing ? pageTemplate(a.attribution.landing) : "Not recorded")),
      recorded: cohort.filter((a) => a.attribution.landing).length,
    };

    // ---- On-site demand: what signed-in people search for ----
    const searches = people.flatMap((a) => a.events.filter((e) => e.event === "search" && inWindow(e.at)).map((e) => ({ a, e })));
    const caps = people.flatMap((a) => a.events.filter((e) => e.event === "search_capped" && inWindow(e.at)));
    const intents: SearchIntent[] = ["leadgen", "trigger", "market", "lookup"];
    base.onSite = {
      byIntent: intents.map((intent) => {
        const rows = searches.filter(({ e }) => (e.meta?.intent ?? "lookup") === intent);
        return {
          intent,
          label: SEARCH_INTENT_LABELS[intent],
          searches: rows.length,
          users: new Set(rows.map(({ a }) => a.userId)).size,
          capped: caps.filter((e) => (e.meta?.intent ?? "lookup") === intent).length,
        };
      }),
      topQueries: (() => {
        const m = new Map<string, { q: string; intent: SearchIntent; searches: number; users: Set<string> }>();
        for (const { a, e } of searches) {
          const intent = (e.meta?.intent as SearchIntent) ?? "lookup";
          if (intent === "lookup" || typeof e.meta?.q !== "string") continue; // company names aren't demand
          const q = e.meta.q.toLowerCase().trim();
          const row = m.get(q) ?? { q, intent, searches: 0, users: new Set<string>() };
          row.searches++;
          row.users.add(a.userId);
          m.set(q, row);
        }
        return [...m.values()]
          .sort((x, y) => y.users.size - x.users.size || y.searches - x.searches)
          .slice(0, 15)
          .map((r) => ({ q: r.q, intent: r.intent, searches: r.searches, users: r.users.size }));
      })(),
    };

    base.mode = mode;
    base.lastRunAt = settings.data?.last_run_at ?? null;
    base.lastRun = (settings.data?.last_run as RevenueDashboard["lastRun"]) ?? null;
    base.search = search;
    return base;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ...base, setupError: `Revenue tables aren't ready: ${msg}. Run supabase/growth.sql in the Supabase SQL editor.` };
  }
}

/** Collapse a signup's referrer / UTM into a channel a person would recognise. */
function channelOf(att: { landing: string | null; referrer: string | null; utmSource: string | null }): string {
  if (!att.landing) return "Not recorded";
  if (att.utmSource) return `Campaign: ${att.utmSource}`;
  const r = (att.referrer ?? "").toLowerCase();
  if (!r) return "Direct / unknown";
  if (/(^|\.)google\./.test(r)) return "Google";
  if (/(^|\.)bing\.com$/.test(r)) return "Bing";
  if (/chatgpt\.com|chat\.openai\.com/.test(r)) return "ChatGPT";
  if (/copilot\.microsoft\.com/.test(r)) return "Copilot";
  if (/perplexity\.ai/.test(r)) return "Perplexity";
  if (/duckduckgo\.com/.test(r)) return "DuckDuckGo";
  if (/linkedin\.com|lnkd\.in/.test(r)) return "LinkedIn";
  return r.replace(/^www\./, "");
}
