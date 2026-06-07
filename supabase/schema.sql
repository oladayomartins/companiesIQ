-- ============================================================
-- CompaniesIQ — Supabase schema
-- Internal database for the collection engine + product features.
-- Apply via the Supabase SQL editor or `supabase db push`.
-- ============================================================

-- --- Ingested companies (the internal CompaniesIQ register) -------
create table if not exists public.companies (
  number          text primary key,
  name            text not null,
  status          text,
  type            text,
  incorporated    date,
  dissolved       date,
  sic_codes       text[] default '{}',
  primary_sector  text,
  primary_category text,
  region          text,
  nation          text,
  postcode        text,
  ingested_at     timestamptz default now(),
  updated_at      timestamptz default now()
);
create index if not exists companies_sector_idx on public.companies (primary_sector);
create index if not exists companies_region_idx on public.companies (region);
create index if not exists companies_incorporated_idx on public.companies (incorporated);

-- --- Daily sector/region aggregates (the analytics layer) ---------
create table if not exists public.formation_stats (
  id              bigint generated always as identity primary key,
  day             date not null,
  sector          text,
  region          text,
  incorporations  integer default 0,
  dissolutions    integer default 0,
  unique (day, sector, region)
);

-- --- User profiles (plan lives here; mirrors auth.users) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  plan        text not null default 'free',   -- free | analyst | team | enterprise
  created_at  timestamptz default now()
);

-- --- Watchlists ---------------------------------------------------
create table if not exists public.watchlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);
create table if not exists public.watchlist_companies (
  watchlist_id  uuid references public.watchlists (id) on delete cascade,
  company_number text not null,
  added_at      timestamptz default now(),
  primary key (watchlist_id, company_number)
);

-- --- Saved searches ----------------------------------------------
create table if not exists public.saved_searches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text,
  query       jsonb not null,
  created_at  timestamptz default now()
);

-- --- Alerts (standing intelligence rules) ------------------------
create table if not exists public.alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  name        text not null,
  sector      text,                              -- SIC sector (factual)
  sic         text,                              -- exact SIC code (factual)
  region      text,
  status      text[] default '{}',
  channel     text not null default 'webhook',  -- email | slack | webhook
  destination text not null,
  active      boolean not null default true,
  created_at  timestamptz default now()
);
-- If upgrading an existing DB created before factual alerts:
--   alter table public.alerts add column if not exists sic text;
--   alter table public.alerts drop column if exists keywords;
create table if not exists public.alert_hits (
  id             bigint generated always as identity primary key,
  alert_id       uuid references public.alerts (id) on delete cascade,
  company_number text not null,
  company_name   text,
  matched_at     timestamptz default now(),
  delivered      boolean default false
);

-- --- Row level security ------------------------------------------
alter table public.profiles          enable row level security;
alter table public.watchlists        enable row level security;
alter table public.watchlist_companies enable row level security;
alter table public.saved_searches    enable row level security;
alter table public.alerts            enable row level security;
alter table public.alert_hits        enable row level security;

create policy "own alerts" on public.alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own alert hits" on public.alert_hits
  for all using (exists (select 1 from public.alerts a where a.id = alert_id and a.user_id = auth.uid()));

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own watchlists" on public.watchlists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own watchlist companies" on public.watchlist_companies
  for all using (exists (select 1 from public.watchlists w where w.id = watchlist_id and w.user_id = auth.uid()));
create policy "own saved searches" on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- public read of the register + aggregates
alter table public.companies enable row level security;
alter table public.formation_stats enable row level security;
create policy "read companies" on public.companies for select using (true);
create policy "read formation stats" on public.formation_stats for select using (true);

-- --- New-profile trigger -----------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Digital-presence enrichment cache (Phase 2) ------------------
-- Measured signals per company (Google Places now; Claude website/AI-visibility
-- later). Every value is sourced + dated; null = Not Assessed. Cached and reused
-- across reports; re-enriched when older than ttl_days. Fenced from the
-- intelligence layer (CH/ONS/Nomis) — see docs/enrichment.md.
create table if not exists public.company_enrichment (
  company_number    text primary key,
  company_name      text,
  gbp_present       boolean,          -- null = not assessed
  review_count      integer,
  review_rating     numeric,
  website_url       text,
  match_confidence  text,             -- high | low | none
  match_score       numeric,
  places_source     text,             -- Google Maps URL (citation)
  ai_visible        boolean,          -- null until the AI-visibility probe runs
  ai_probe          jsonb,
  raw               jsonb,            -- full evidence blob for audit
  checked_at        timestamptz default now(),
  ttl_days          integer default 30
);
create index if not exists company_enrichment_checked_idx on public.company_enrichment (checked_at);

-- World-readable like the register; written only by the service role (enrichment job).
alter table public.company_enrichment enable row level security;
create policy "read enrichment" on public.company_enrichment for select using (true);

-- --- Founder funnel: lead capture + campaign events (Phase 2) ------
-- Leads contain PII — RLS is ON with NO policies, so only the service role
-- (the /api/leads handler) can read/write. Never client-readable.
create table if not exists public.leads (
  id             bigint generated always as identity primary key,
  company_number text,
  company_name   text,
  first_name     text,
  last_name      text,
  email          text not null,
  phone          text,
  source         text,            -- QR campaign tag, e.g. digitwarehouse
  partner        text,
  verified       boolean default false,
  verify_token   text,
  purchased      boolean default false,
  purchased_at   timestamptz,
  created_at     timestamptz default now()
);
create index if not exists leads_company_idx on public.leads (company_number);
create index if not exists leads_token_idx on public.leads (verify_token);
alter table public.leads enable row level security;

-- Funnel/QR analytics — scans, views, lead submits, consultation clicks.
create table if not exists public.funnel_events (
  id             bigint generated always as identity primary key,
  company_number text,
  event          text,            -- scan | view | lead | consult
  source         text,
  created_at     timestamptz default now()
);
create index if not exists funnel_events_event_idx on public.funnel_events (event);
alter table public.funnel_events enable row level security;
