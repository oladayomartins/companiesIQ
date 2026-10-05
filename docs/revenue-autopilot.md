# Revenue Autopilot

Admin → **Revenue** (`/app/revenue`, `ADMIN_EMAILS` only). It measures the paid funnel from first-party data and works it automatically.

## Why it exists (Oct 2026 baseline)

The 90-day review showed 889 visitors, 37 sign-ups, 8 checkout starts and 2 purchases. Sign-up converts well. **Checkout is the leak: 6 of 8 starts didn't complete.** GA4 couldn't help, for four reasons:

- About 21% of its users were bots.
- It recorded no events inside checkout.
- It had no lead-stage events.
- It reported £0 item revenue.

The autopilot answers each of these with data GA can't see or can't keep clean.

## What it does

| Piece | Where |
| --- | --- |
| First-party funnel events (signed-in only, so bot-free) | `lib/growth/events.ts`, `/api/growth/event` |
| `checkout_started` / `completed` / `expired` | `/api/subscribe`, `/api/webhooks/stripe` |
| `paywall_view` (ProGate, locked company report), `pricing_view`, `upgrade_view`, `plan_select` | `lib/growth/beacon.ts` (also sent to GA4) |
| Intent scoring + next-email rules (pure, easy to tune) | `lib/growth/playbook.ts` |
| Daily run: send / dry-run, plus a hot-lead digest to admins | `lib/growth/engine.ts`, `/api/cron/growth` (09:00 UTC) |
| Dashboard data: Stripe MRR, funnel, abandoned checkouts, leads, email outcomes | `lib/growth/dashboard.ts` |
| Search Console CSV import + opportunity finder | `lib/growth/search-console.ts` |

### Emails (one per account per 48h at most; never to paid, comped or opted-out accounts)

1. **Checkout recovery.** Sent 1h to 3 days after an unfinished checkout, once per Stripe session. Its link resumes checkout directly.
2. **Recovery follow-up.** Sent 3+ days later if they still haven't paid. It pitches monthly billing with no lock-in.
3. **Paywall follow-up.** Sent after 2+ paywall hits, or a paywall hit plus a pricing view, with no checkout in 14 days. Repeats at most every 30 days.
4. **Activation.** Sent to accounts 1–4 days old with no activity. Sent once only.

Email links go to `/app/upgrade?plan=…&interval=…&utm_source=autopilot`, which starts Stripe checkout immediately. A "conversion" is a completed checkout within 7 days of an email.

## Go-live checklist

1. Run `supabase/growth.sql` in the Supabase SQL editor.
2. Set `GROWTH_FROM_EMAIL` (or rely on `ALERTS_FROM_EMAIL`). Set `GROWTH_REPLY_TO` to an inbox someone reads. `RESEND_API_KEY` must also be set.
3. Make sure `CRON_SECRET` is set in Vercel (the daily cron needs it).
4. In Stripe → Webhooks, add **`checkout.session.expired`** to the endpoint's events.
5. Open `/app/revenue`. The mode starts at **Dry run**: press **Run now** and review the email log. Switch to **Live** when the list looks right.
6. Import the GSC Pages and Queries exports each month.

Mode lives in `growth_settings` (`off` / `dry_run` / `live`). In dry run, no customer email is sent, but admins still get the hot-lead digest.
