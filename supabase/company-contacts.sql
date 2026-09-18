-- ============================================================
-- Contact intelligence cache + suppression list (Phase 3)
-- ------------------------------------------------------------
-- Layer 2/3 of the enrichment pipeline: what a company publishes about itself
-- on its own website, with the verification checks that were run against each
-- value. See docs/contact-enrichment.md and lib/enrichment/contact.ts.
--
-- Everything here is self-published business contact data, re-presented with
-- its provenance — not a purchased contact database. It is fenced off from the
-- Companies House / ONS / Nomis intelligence layer exactly as
-- public.company_enrichment is.
-- ============================================================

create table if not exists public.company_contacts (
  company_number text primary key,
  company_name   text,
  -- measured | no_website | not_assessed | blocked
  status         text not null default 'not_assessed',
  -- The verified website + the checks that verified it: {url, host, checks[],
  -- score, confidence, discoveredVia, contactPage}.
  website        jsonb,
  -- ContactPoint[] — each {value, display, role, sources[], foundOn[],
  -- checks[], score, confidence}. Stored whole so the evidence trail and the
  -- value can never drift apart.
  emails         jsonb not null default '[]'::jsonb,
  phones         jsonb not null default '[]'::jsonb,
  pages_crawled  jsonb not null default '[]'::jsonb,
  notes          jsonb not null default '[]'::jsonb,
  checked_at     timestamptz not null default now(),
  ttl_days       integer not null default 30
);

create index if not exists company_contacts_checked_idx on public.company_contacts (checked_at);
create index if not exists company_contacts_status_idx on public.company_contacts (status);

-- Contact details are personal data far more often than register facts are (a
-- sole trader's mobile is both a business number and a person's number), so
-- unlike company_enrichment this table is NOT world-readable. RLS is on with
-- NO select policy: only the service role — i.e. the plan-gated API routes in
-- app/api/contacts — can read it, and those routes apply their own entitlement
-- and rate limits before returning anything.
alter table public.company_contacts enable row level security;
drop policy if exists "read contacts" on public.company_contacts;

-- ------------------------------------------------------------
-- Suppression list — the opt-out that makes the rest defensible
-- ------------------------------------------------------------
-- A business or individual who asks us to stop showing a published detail is
-- recorded here. lib/enrichment/contact.ts filters against this on every read
-- AND every write, so a later re-crawl cannot resurrect a suppressed value.
-- Keyed on the canonical value (lower-cased email / E.164 phone) rather than
-- the company, because the same mobile can appear against several companies.
create table if not exists public.contact_suppressions (
  value       text primary key,          -- lower-cased email or E.164 phone
  kind        text not null,             -- email | phone
  reason      text,                      -- owner request | complaint | internal
  requested_by text,                     -- who asked (email address or 'internal')
  created_at  timestamptz not null default now()
);

alter table public.contact_suppressions enable row level security;
-- Service role only, both directions. The public opt-out form writes through
-- an API route so the request can be logged and rate-limited.

-- ------------------------------------------------------------
-- Contact-discovery meter
-- ------------------------------------------------------------
-- Each plan buys N DISTINCT companies per calendar month (UTC). Re-opening a
-- company already looked up that month does not consume another unit, which is
-- the same shape as public.report_unlocks and the unit customers actually think
-- in ("companies I researched"). Enforced by lib/access.ts.
create table if not exists public.contact_lookups (
  user_id        uuid not null references auth.users(id) on delete cascade,
  company_number text not null,
  month          text not null,                 -- 'YYYY-MM' (UTC)
  looked_up_at   timestamptz not null default now(),
  primary key (user_id, company_number, month)
);
alter table public.contact_lookups enable row level security;
drop policy if exists "own contact lookups read" on public.contact_lookups;
create policy "own contact lookups read" on public.contact_lookups
  for select using (auth.uid() = user_id);
create index if not exists contact_lookups_user_month_idx
  on public.contact_lookups (user_id, month);
