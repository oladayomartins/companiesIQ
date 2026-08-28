-- ============================================================
-- Audit log — who did what, when
-- ------------------------------------------------------------
-- An Enterprise requirement, and the practical answer to a subject-access or
-- erasure request: without it, "what did you do with my data" has no answer.
--
-- Design notes:
--   * append-only by construction — no update/delete path in the app, and RLS
--     denies everything so only the service role writes.
--   * `subject` is deliberately loose text (a company number, an officer id, a
--     key id). A foreign key per event type would mean a migration every time
--     we log something new, and a broken log is worse than a loose one.
--   * `meta` is jsonb for the detail that varies by action, so the table shape
--     never has to change.
-- ============================================================

create table if not exists public.audit_events (
  id         bigserial primary key,
  user_id    uuid references auth.users (id) on delete set null,
  -- Kept when the user is deleted: an audit trail that erases itself with the
  -- account cannot answer questions about that account.
  actor_email text,
  action     text not null,          -- 'contact.reveal', 'export.csv', 'api.key.create', …
  subject    text,                   -- what it acted on
  meta       jsonb,
  ip         text,
  created_at timestamptz not null default now()
);
alter table public.audit_events enable row level security;

create index if not exists audit_events_user_idx on public.audit_events (user_id, created_at desc);
create index if not exists audit_events_action_idx on public.audit_events (action, created_at desc);
create index if not exists audit_events_subject_idx on public.audit_events (subject) where subject is not null;
