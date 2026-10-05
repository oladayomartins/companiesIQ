-- ============================================================
-- Research pipeline tables
-- ------------------------------------------------------------
-- research_datasets : one row per published edition. Holds the
--   aggregate payload (counts + query ledger + methodology) that
--   backs the article, so figures can be re-served as CSV and as
--   Dataset structured data without re-querying Companies House.
--   Public-readable: it is the evidence behind a public article.
-- research_runs     : append-only log of unattended pipeline runs
--   and the publish/hold decision each one made. Service-role only.
-- ============================================================

create table if not exists public.research_datasets (
  slug         text primary key,
  study        text not null,
  period_id    text not null,
  title        text not null,
  payload      jsonb not null,
  generated_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.research_datasets enable row level security;
-- The dataset is the published evidence for a public page, so reads are open;
-- all writes go through the service role (the pipeline), which bypasses RLS.
drop policy if exists "read research datasets" on public.research_datasets;
create policy "read research datasets" on public.research_datasets for select using (true);
create index if not exists research_datasets_study_idx on public.research_datasets (study, period_id desc);

create table if not exists public.research_runs (
  id          uuid primary key default gen_random_uuid(),
  study       text not null,
  period_id   text not null,
  slug        text not null,
  status      text not null,              -- published | drafted | failed
  issues      jsonb not null default '[]'::jsonb,
  api_calls   integer not null default 0,
  duration_ms integer not null default 0,
  error       text,
  created_at  timestamptz not null default now()
);
alter table public.research_runs enable row level security;
-- No public policy: the run log is operational, service-role only.
create index if not exists research_runs_slug_idx on public.research_runs (slug, created_at desc);
