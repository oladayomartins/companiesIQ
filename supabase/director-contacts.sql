-- ============================================================
-- Director contact enrichment — cache + reveal audit
-- ------------------------------------------------------------
-- Run in the Supabase SQL editor (or append to schema.sql). Part of the
-- ENRICHMENT layer (third-party, fenced from the Companies House / ONS / Nomis
-- register), so it has its own tables and its own source label.
--
-- Personal contact data is regulated (UK GDPR / PECR). Two rules baked in here:
--   1. Both tables are RLS-locked with NO public policy — every read/write goes
--      through the service role (the Pro-gated API route), never the browser.
--   2. contact_reveals is an accountability log: who revealed which director's
--      contact and when, so subject-access / erasure requests can be honoured.
-- ============================================================

-- Cached enriched contacts, keyed by Companies House officer id. We pay a
-- provider once per director, then serve from cache until it goes stale.
create table if not exists public.director_contacts (
  officer_id       text primary key,
  name             text,
  email            text,
  email_confidence text,                    -- high | low | none
  phone            text,
  phone_confidence text,                     -- high | low | none
  provider         text,                     -- which enrichment provider returned it
  source           text,                     -- human-readable provenance label
  fetched_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.director_contacts enable row level security;
-- No policy on purpose: service-role writes/reads only (RLS denies everyone else).

-- Reveal audit — one row per (user, director) reveal event. Powers usage
-- metering AND GDPR accountability (who accessed whose personal data, when).
create table if not exists public.contact_reveals (
  id          uuid primary key default gen_random_uuid(),
  officer_id  text not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  revealed_at timestamptz not null default now()
);
alter table public.contact_reveals enable row level security;
create index if not exists contact_reveals_user_idx on public.contact_reveals (user_id, revealed_at desc);
create index if not exists contact_reveals_officer_idx on public.contact_reveals (officer_id);
