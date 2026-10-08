-- ============================================================
-- Profiles — company-report tour seen flag (NOT YET APPLIED to the live DB)
-- ------------------------------------------------------------
-- report_tour_at records that a signed-in user finished or skipped the
-- company report's first-visit tour, so the welcome strip doesn't reappear on
-- another device. Signed-out readers use localStorage instead. Until this runs,
-- the app treats every signed-in user as "not stored" and falls back to
-- localStorage — nothing breaks. Run in the Supabase SQL editor.
-- ============================================================
alter table public.profiles add column if not exists report_tour_at timestamptz;
