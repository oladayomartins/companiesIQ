-- Company financials cache (iXBRL) — Phase 2. Already applied to the live DB.
-- Financial figures parsed from filed accounts, cached on the register cache so
-- search can filter by size/health (see docs/financials-ixbrl.md).
alter table public.companies add column if not exists fin_turnover      bigint;
alter table public.companies add column if not exists fin_net_assets    bigint;
alter table public.companies add column if not exists fin_cash          bigint;
alter table public.companies add column if not exists fin_employees     integer;
alter table public.companies add column if not exists fin_accounts_type text;
alter table public.companies add column if not exists fin_period_end    date;
alter table public.companies add column if not exists fin_checked_at    timestamptz;
create index if not exists companies_fin_net_assets_idx on public.companies (fin_net_assets);
create index if not exists companies_fin_turnover_idx on public.companies (fin_turnover);
