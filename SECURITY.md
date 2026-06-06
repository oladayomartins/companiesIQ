# Security review — CompaniesIQ

A focused review of the API routes, secret handling, and data access, with the
fixes applied in this pass and the residual recommendations before scale.

## Threat model (in scope)
Public web app over public UK-register data. Sensitive surfaces: the secrets,
the write path to the database, the user-configurable outbound calls (alert
webhooks/email), and the user-owned data (watchlists, saved searches, alerts).

---

## Findings fixed in this pass

| # | Severity | Finding | Fix |
|---|---|---|---|
| 1 | **High** | `/api/alerts/run` accepted arbitrary alert rules from the request body and would POST to any `destination` and send any email — an unauthenticated **SSRF / email-abuse** vector on a deployed instance. | Body-supplied rules are now honoured **only outside production**; production always evaluates the user's persisted, RLS-owned rules. |
| 2 | **High** | Same endpoint's auth check (`secret && auth && …`) let a **missing** `Authorization` header bypass the secret entirely. | Rewritten to fail closed: when a secret is set, a matching bearer token is required. Both `/api/ingest` and `/api/alerts/run` also 503 in production if no secret is configured. |
| 3 | **Medium** | Webhook/Slack delivery could be pointed at internal hosts (`127.0.0.1`, `10.0.0.0/8`, link-local, etc.) — **SSRF** even via legitimate user rules. | `isSafeUrl()` guard: HTTPS only, blocks loopback / RFC-1918 / link-local / `.internal` / `.local` / ULA hosts before any fetch. |
| 4 | **Medium** | Ingestion wrote to `public.companies` with the anon key; RLS (select-only policy) would silently reject inserts, and using anon for system writes is wrong. | Added a dedicated **service-role** client (`getSupabaseAdmin`) used only for the system write path (ingest) and the cron's all-tenant alert read. |
| 5 | **Low** | Alert email HTML interpolated company names unescaped (stored-XSS-style risk in the email client). | All interpolated values are HTML-escaped. |

## Verified
- SSRF guard blocks `http://127.0.0.1/…` and non-HTTPS destinations (returns "blocked destination").
- Email channel still delivers (Resend when keyed; logs otherwise).
- Production build green; no console errors.

---

## Posture that was already correct
- **Secrets are server-only.** `COMPANIES_HOUSE_API_KEY`, `ANTHROPIC_API_KEY`,
  `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INGEST_SECRET` are read only in
  route handlers / `server-only` libs; only `NEXT_PUBLIC_*` reach the client.
  `lib/companies-house.ts` and `lib/data.ts` import `server-only`.
- **RLS** on all user-owned tables (`profiles`, `watchlists`, `saved_searches`,
  `alerts`, `alert_hits`) with `auth.uid()` policies; register tables are
  read-only to clients.
- **Icon** `dangerouslySetInnerHTML` uses only static, in-repo SVG path data —
  no user input.
- Free browsing of `/app` is intentional (freemium product), not a gap.

---

## Residual recommendations (before scale)
1. **Rate limiting** — add per-IP limits on `/api/search`, `/api/discover`,
   `/api/alerts` (e.g. Vercel Edge Middleware + Upstash). Currently unbounded.
2. **SSRF hardening** — the hostname blocklist doesn't stop DNS rebinding. For
   high assurance, resolve + pin the IP and re-check at fetch time, or route
   outbound webhooks through an egress proxy with an allowlist.
3. **Cron auth on Vercel** — ensure the scheduled invocations actually send the
   `INGEST_SECRET` bearer (or use Deployment Protection bypass); otherwise the
   prod 503 will block them.
4. **Email verification** — only send alert emails to addresses the user has
   confirmed, to avoid being used as an open notifier.
5. **Dependency + secret scanning** — enable Dependabot and a secret scanner;
   never commit `.env.local` (already in `.gitignore`).
6. **Companies House rate limits** — the client caches for 5 min; for higher
   volume add a queue/backoff around the 600-req/5-min ceiling.
