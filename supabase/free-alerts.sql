-- ============================================================
-- Free new-company alert subscribers (lead magnet)
-- ------------------------------------------------------------
-- Run in the Supabase SQL editor (or append to schema.sql). A no-account,
-- email-only opt-in: "free weekly email of new companies in <sector><region>".
-- Separate from the Pro `alerts` table (that's account-bound signal rules).
--
-- PII + marketing consent, so: RLS-locked (service-role only — the public
-- subscribe route uses the service key), one-click unsubscribe token, and
-- status tracked for compliance. Single opt-in with a clear unsubscribe; flip
-- `status` default to 'pending' + confirm the token if you later want double
-- opt-in.
-- ============================================================
create table if not exists public.alert_subscribers (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  first_name   text,
  company      text,
  sector       text not null default '',   -- '' = any sector
  region       text not null default '',   -- '' = anywhere
  token        uuid not null default gen_random_uuid(),  -- one-click unsubscribe
  status       text not null default 'active',           -- active | unsubscribed
  source       text,                                      -- where they signed up (company page, /free-alerts, blog…)
  created_at   timestamptz not null default now(),
  last_sent_at timestamptz,
  unique (email, sector, region)
);
alter table public.alert_subscribers enable row level security;
-- No public policy: reads/writes go through the service role only.
create index if not exists alert_subscribers_active_idx on public.alert_subscribers (status) where status = 'active';
create index if not exists alert_subscribers_token_idx on public.alert_subscribers (token);
