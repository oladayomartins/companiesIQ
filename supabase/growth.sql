-- ============================================================
-- Revenue Autopilot — first-party funnel + lifecycle emails
-- ------------------------------------------------------------
-- Run in the Supabase SQL editor. Idempotent.
--
-- Why first-party: GA4 is polluted (bot traffic, ~64% of sessions with no
-- landing page, blocked tags) and can't see inside checkout. These tables are
-- written server-side and ONLY for signed-in accounts, so every row is a real
-- person — the funnel the admin Revenue screen reports is bot-free by design.
--
-- All four tables carry PII or business data: RLS ON with NO policies, so only
-- the service role (API routes, cron, webhook) can read or write.
-- ============================================================

-- Funnel events per account: paywall_view, pricing_view, upgrade_view,
-- plan_select, checkout_started, checkout_completed, checkout_expired.
create table if not exists public.growth_events (
  id         bigserial primary key,
  user_id    uuid references auth.users (id) on delete cascade,
  event      text not null,
  plan       text,
  billing    text,                 -- monthly | annual
  value      numeric,              -- £ (checkout amount where known)
  ref        text,                 -- Stripe checkout session id, paywall feature, …
  meta       jsonb,
  created_at timestamptz not null default now()
);
alter table public.growth_events enable row level security;
create index if not exists growth_events_user_idx on public.growth_events (user_id, created_at desc);
create index if not exists growth_events_event_idx on public.growth_events (event, created_at desc);
create index if not exists growth_events_ref_idx on public.growth_events (ref) where ref is not null;

-- Every lifecycle email the autopilot sent (or WOULD have sent, in dry-run).
-- The unique key is the dedupe guarantee: one template per user per ref
-- (ref = the checkout session for recovery emails, '' otherwise).
create table if not exists public.growth_emails (
  id         bigserial primary key,
  user_id    uuid references auth.users (id) on delete cascade,
  email      text not null,
  template   text not null,
  ref        text not null default '',
  status     text not null,        -- sent | dry_run | failed
  score      integer,
  created_at timestamptz not null default now(),
  unique (user_id, template, ref, status)
);
alter table public.growth_emails enable row level security;
create index if not exists growth_emails_user_idx on public.growth_emails (user_id, created_at desc);
create index if not exists growth_emails_created_idx on public.growth_emails (created_at desc);

-- Single-row settings: autopilot mode + last run summary.
create table if not exists public.growth_settings (
  id          integer primary key default 1 check (id = 1),
  mode        text not null default 'dry_run' check (mode in ('off', 'dry_run', 'live')),
  last_run_at timestamptz,
  last_run    jsonb,
  updated_by  text,
  updated_at  timestamptz not null default now()
);
alter table public.growth_settings enable row level security;
insert into public.growth_settings (id) values (1) on conflict (id) do nothing;

-- Google Search Console exports uploaded from the admin screen (Pages and
-- Queries tabs). The latest import of each kind drives the Search demand panel.
create table if not exists public.search_console_imports (
  id          bigserial primary key,
  kind        text not null check (kind in ('pages', 'queries')),
  rows        jsonb not null,
  row_count   integer not null,
  imported_by text,
  imported_at timestamptz not null default now()
);
alter table public.search_console_imports enable row level security;
create index if not exists search_console_imports_kind_idx on public.search_console_imports (kind, imported_at desc);

-- Lifecycle email opt-out (PECR): one-click unsubscribe token per profile.
alter table public.profiles add column if not exists marketing_opt_out boolean not null default false;
alter table public.profiles add column if not exists growth_token uuid not null default gen_random_uuid();
create index if not exists profiles_growth_token_idx on public.profiles (growth_token);
