-- ============================================================
-- Profiles — company-report tour seen flag (applied to the live DB 2026-10-08)
-- ------------------------------------------------------------
-- report_tour_at records that a signed-in user finished or skipped the
-- company report's first-visit tour, so the welcome strip doesn't reappear on
-- another device. Signed-out readers use localStorage instead. If a fresh
-- database lacks the column, the app falls back to localStorage — nothing
-- breaks. Run in the Supabase SQL editor when provisioning fresh.
-- ============================================================
alter table public.profiles add column if not exists report_tour_at timestamptz;
