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
  keywords    text[] default '{}',
  sector      text,
  region      text,
  status      text[] default '{}',
  channel     text not null default 'webhook',  -- email | slack | webhook
  destination text not null,
  active      boolean not null default true,
  created_at  timestamptz default now()
);
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
