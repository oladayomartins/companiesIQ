-- ============================================================
-- Profiles — company + onboarding flag (already applied to the live DB)
-- ------------------------------------------------------------
-- Adds a company field (captured in first-run onboarding) and onboarded_at,
-- which records that the user has completed OR skipped the onboarding prompt so
-- it never reappears. Run in the Supabase SQL editor if provisioning fresh.
-- ============================================================
alter table public.profiles add column if not exists company text;
alter table public.profiles add column if not exists onboarded_at timestamptz;
