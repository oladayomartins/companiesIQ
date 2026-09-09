# Director contact enrichment (email / direct dial)

_Status: **scaffold built, dark by default.** Turns on only when a provider is wired via `CONTACT_ENRICH_URL`._

Adds a Team-tier "Reveal contact" for directors: a verified business **email** and **direct dial**, enriched from a third-party provider. This is the **enrichment layer** — fenced off from the Companies House / ONS / Nomis register, with its own source label and its own compliance posture. The register does **not** hold personal director contact data; this is the only way to get it.

## How it works

1. On a director page, Team+ users see a **Reveal contact** button (sub-Team users see an upgrade wall).
2. It POSTs to `/api/directors/contact` → `canUseContactData` gate → pulls the officer's register profile → calls the configured provider with `{officerId, name, companies[]}`.
3. The result is normalised, **cached** (`director_contacts`, 90-day TTL — we pay per director once), and the reveal is **audited** (`contact_reveals`).
4. Every field is a measured provider value with a confidence (`high`/`low`/`none`) or `null` = **Not Assessed**. Nothing is ever guessed.

## Files

| File | Role |
|---|---|
| `supabase/director-contacts.sql` | `director_contacts` cache + `contact_reveals` audit (RLS-locked, service-role only) |
| `lib/enrichment/contacts.ts` | Provider-agnostic adapter (BYO webhook), cache, audit, graceful degradation |
| `lib/enrichment/types.ts` | `DirectorContact` (client-safe) |
| `lib/subscription.ts` | `caps.contactData` (Team + Enterprise) |
| `lib/access.ts` | `canUseContactData()` gate |
| `app/api/directors/contact/route.ts` | Gated, audited reveal endpoint |
| `components/app/RevealContact.tsx` | Reveal UI (locked / reveal / result) |
| `app/app/director/[id]/page.tsx` | Renders the card when configured + officer is an individual |

## Activating it

1. Run `supabase/director-contacts.sql` in the Supabase SQL editor.
2. Stand up a thin proxy for your chosen provider (Apollo / Lusha / Cognism / Hunter). It must accept:
   ```json
   POST  { "officerId": "...", "name": "Jane Smith", "companies": [{ "name": "ACME LTD", "number": "01234567" }] }
   ```
   and return:
   ```json
   { "email": "jane@acme.co.uk", "phone": "+44...", "emailConfidence": "high", "phoneConfidence": "low", "provider": "apollo" }
   ```
   (any field may be null → "Not Assessed").
3. Set `CONTACT_ENRICH_URL` (and optional `CONTACT_ENRICH_KEY`) in Vercel. The feature lights up automatically.

## Provider cost (indicative)

| Provider | Per-lookup | Notes |
|---|---|---|
| Hunter | ~£0.03 (email only) | Cheapest starter |
| Apollo | ~£0.15–0.20 | Cheap emails, weaker UK mobiles |
| Lusha | email ~£0.08 / phone ~£0.80 | Simple credits |
| Cognism | annual contract (~£12k+/yr) | Best UK mobiles + compliance; for scale |

Caching means you pay **once per director**, not per reveal — economics improve fast.

## Compliance (must-read before going live)

Personal contact data is regulated. This scaffold is built to support it, but it is **not legal advice** — get DPO/counsel sign-off.

- **UK GDPR** — director personal email/mobile is personal data. Establish a lawful basis (usually *legitimate interest* + LIA), publish a privacy notice covering enrichment, and honour objection/erasure (the `contact_reveals` audit + `director_contacts` cache make deletion tractable).
- **PECR** — before any *marketing call*, the number must be screened against **TPS/CTPS**. The UI already shows this reminder; consider enforcing screening server-side before exposing phones for dialling.
- **Provenance** — keep it labelled "Enriched · not from Companies House" (done) and, when live, add a `SOURCES` entry to `lib/sources.ts`:
  ```ts
  { id: "contact-enrichment", name: "Contact enrichment", provider: "<vendor>", status: "live",
    licence: "Commercial / third-party", url: "<vendor url>",
    powers: "Director business email and direct dial on the Team plan (enrichment layer).",
    note: "Third-party personal contact data — subject to UK GDPR & PECR; not from the register." }
  ```
  (Left out until a provider is chosen, so /sources stays accurate.)
