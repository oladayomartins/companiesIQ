-- ============================================================
-- Profiles — saved default lens
-- ------------------------------------------------------------
-- The company report re-weights its score, signals and actions for what the
-- user sells (lib/lens.ts). Anonymous and free visitors keep a session choice
-- in localStorage; Pro users can pin one as their default, stored here.
--
-- lens_profile  a PROFILES key from lib/lens.ts, e.g. 'accountancy'
-- lens_other    free text captured when the user picks "Other — not listed";
--               it is roadmap input (which weighting to build next), not
--               something the scorer reads.
-- ============================================================
alter table public.profiles add column if not exists lens_profile text;
alter table public.profiles add column if not exists lens_other text;
