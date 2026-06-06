# Deploying CompaniesIQ

A production deploy has three pieces: the **Next.js app** (Vercel), the
**database** (Supabase), and the **ingestion cadence** (Vercel Cron and/or the
always-on worker). The app runs with zero keys on sample data; each key below
unlocks a capability.

---

## 1. Prerequisites / keys

| Key | Where to get it | Unlocks |
|---|---|---|
| `COMPANIES_HOUSE_API_KEY` | [developer.company-information.service.gov.uk](https://developer.company-information.service.gov.uk/) (free) | Live register (search, profiles, officers, filings, charges, PSCs) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Auth, watchlists, saved searches, alerts |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (**secret**) | Server-side ingestion writes + cron alert reads |
| `INGEST_SECRET` | generate (`openssl rand -hex 32`) | Protects `/api/ingest` + `/api/alerts/run` |
| `ANTHROPIC_API_KEY` | platform.claude.com | AI natural-language search on `/app/discover` |
| `RESEND_API_KEY` / `ALERTS_FROM_EMAIL` | [resend.com](https://resend.com) | Sending alert emails |

> **Never** expose `SUPABASE_SERVICE_ROLE_KEY`, `INGEST_SECRET`, `COMPANIES_HOUSE_API_KEY`,
> `ANTHROPIC_API_KEY`, or `RESEND_API_KEY` to the browser. Only the two
> `NEXT_PUBLIC_*` values are client-visible.

---

## 2. Supabase

1. Create a project.
2. In the SQL editor, run [`supabase/schema.sql`](supabase/schema.sql) — it creates the
   tables (`companies`, `formation_stats`, `profiles`, `watchlists`,
   `saved_searches`, `alerts`, `alert_hits`), enables **RLS**, adds the
   per-user policies, and installs the new-user → profile trigger.
3. (Magic-link auth) Authentication → URL Configuration → add
   `https://<your-domain>/auth/callback` as a redirect URL.

RLS is on by everything user-owned; the register tables are world-readable
(`select using (true)`) and only written by the **service-role** key.

---

## 3. Vercel

1. Import the repo. Framework preset: **Next.js** (auto-detected).
2. Add every key from §1 as an Environment Variable (Production + Preview).
3. Deploy. [`vercel.json`](vercel.json) registers two crons (every 15 min):
   `/api/ingest` and `/api/alerts/run`.
4. Custom domain → point `app.companiesiq.co.uk` (or your domain) at the project.

### Cron auth
Vercel Cron requests are internal, but the endpoints **fail closed in production**:
with `INGEST_SECRET` set they require `Authorization: Bearer <INGEST_SECRET>`.
Configure the cron to send that header (Vercel project → Cron → headers), or
front the endpoints with a Vercel Deployment Protection bypass token.

---

## 4. Ingestion cadence — cron vs worker

- **Vercel Cron** (default): every 15 min, serverless. Good enough for most.
- **Always-on worker** (tighter cadence / heavier volume): run
  `npm run worker` on any always-on host (Railway, Fly.io, a VM, systemd,
  a container). It heartbeats `/api/ingest` + `/api/alerts/run`:

  ```bash
  APP_URL=https://app.companiesiq.co.uk \
  INGEST_SECRET=<same secret> \
  WORKER_INTERVAL_MS=300000 \
  npm run worker
  ```

Use one or the other (or both — upserts are idempotent on `company_number`).

---

## 5. Pre-launch checklist

- [ ] `supabase/schema.sql` applied; RLS confirmed on (Supabase → Auth → Policies).
- [ ] All secrets set in Vercel; only `NEXT_PUBLIC_*` are public.
- [ ] `INGEST_SECRET` set (endpoints 503 in prod without it) and wired into the cron header.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (ingestion can't persist without it).
- [ ] Auth redirect URL added in Supabase.
- [ ] Resend domain verified if using email alerts.
- [ ] `npm run build` green; smoke-test `/`, `/app`, `/app/search`, a company report.
- [ ] Trigger `/api/ingest` once manually (with the bearer header) and confirm rows land in `companies`.
- [ ] Review [SECURITY.md](SECURITY.md).
