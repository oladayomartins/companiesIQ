-- ============================================================
-- Signup attribution (run in the Supabase SQL editor; idempotent)
-- ------------------------------------------------------------
-- How each new account's signup visit started — written once by
-- /api/growth/attribution from lib/growth/visit.ts. No identifier beyond the
-- account it belongs to; RLS on profiles already limits reads to the owner.
-- ============================================================
alter table public.profiles add column if not exists signup_landing  text;   -- first path of the signup visit
alter table public.profiles add column if not exists signup_referrer text;   -- external referring host
alter table public.profiles add column if not exists signup_utm      jsonb;  -- {utm_source, utm_medium, …}
