-- ============================================================
-- Public API — keys and monthly usage
-- ------------------------------------------------------------
-- Run in the Supabase SQL editor. Powers the customer-facing API sold on the
-- Team plan ("API access · 10k calls/mo").
--
-- Two rules baked in:
--   1. Keys are stored HASHED. The plaintext is shown once, at creation, and
--      never again — a leaked database must not yield working credentials.
--   2. Both tables are RLS-locked with no policy, so every read and write goes
--      through the service role. The browser never touches them directly.
-- ============================================================

create table if not exists public.api_keys (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text,                                   -- user's label, e.g. "Zapier"
  -- sha256 of the full key. Never store the key itself.
  key_hash    text not null unique,
  -- First 12 chars ("ciq_live_ab12"), shown in the UI so a key is identifiable
  -- without being usable.
  key_prefix  text not null,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at  timestamptz
);
alter table public.api_keys enable row level security;
create index if not exists api_keys_user_idx on public.api_keys (user_id) where revoked_at is null;

-- One row per key per calendar month. Incremented on every authorised call, so
-- the quota is countable without scanning a request log.
create table if not exists public.api_usage (
  key_id   uuid not null references public.api_keys (id) on delete cascade,
  month    text not null,                              -- 'YYYY-MM' (UTC)
  calls    integer not null default 0,
  primary key (key_id, month)
);
alter table public.api_usage enable row level security;

-- Atomic increment. Doing this read-modify-write in application code would
-- undercount under concurrency, which is exactly when the quota matters.
create or replace function public.record_api_call(p_key_id uuid, p_month text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total integer;
begin
  insert into public.api_usage (key_id, month, calls)
  values (p_key_id, p_month, 1)
  on conflict (key_id, month)
  do update set calls = public.api_usage.calls + 1
  returning calls into new_total;
  return new_total;
end;
$$;
