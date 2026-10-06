-- ============================================================
-- Blog: key takeaways (run in the Supabase SQL editor; idempotent)
-- ------------------------------------------------------------
-- 3–5 one-sentence takeaways per post, rendered in the box under the intro and
-- used as the BlogPosting `abstract`. Empty = no box (unless the body carries
-- its own "## Key takeaways" list, which the template lifts into the box).
-- ============================================================
alter table public.posts add column if not exists key_takeaways jsonb not null default '[]'::jsonb;

-- One-off: posts saved from the CMS before the author fix were re-attributed to
-- the editor's email address. Restore the house byline.
update public.posts set author = 'CompaniesIQ Research' where author like '%@%';
