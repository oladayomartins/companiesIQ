-- ============================================================
-- Director contacts — provider cache (third-party enrichment)
-- ------------------------------------------------------------
-- Run in the Supabase SQL editor AFTER company-contacts.sql and audit-log.sql.
-- Part of contact intelligence (docs/contact-enrichment.md §10): the one place
-- contact data is bought from a provider rather than self-published, so it is
-- cached hard (90-day TTL — every miss is a paid call).
--
-- Everything else reuses the company-contacts machinery, so there is no table
-- for it here:
--   • metering      → public.contact_lookups, keyed 'officer:<id>'
--   • accountability→ public.audit_events, action 'contact.reveal'
--   • opt-outs      → public.contact_suppressions (applied on read AND write)
--
-- Personal data (UK GDPR / PECR): RLS on with NO policy — service role only.
-- ============================================================

create table if not exists public.director_contacts (
  officer_id       text primary key,
  name             text,
  email            text,                     -- lower-cased
  email_confidence text,                     -- provider's claim: high | low | none
  phone            text,                     -- E.164
  phone_confidence text,                     -- provider's claim: high | low | none
  provider         text,                     -- which enrichment provider returned it
  source           text,                     -- human-readable provenance label
  fetched_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.director_contacts enable row level security;
-- No policy on purpose: service-role reads/writes only.

-- Superseded by audit_events + contact_lookups. Only exists if an earlier draft
-- of this file was run; safe to drop (it was never written to in production).
-- drop table if exists public.contact_reveals;
