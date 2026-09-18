# Contact intelligence — the enrichment pipeline (Phase 3)

_Status: **built**. Companion to `docs/enrichment.md` (digital presence) and `docs/architecture.md`._

Companies House gives us **identity**. It does not give us **contact details** — it never has, and it
is not going to. So the product finds them the only way that is defensible: from what the company
itself publishes, with the provenance attached.

---

## 0. The hard rule (unchanged from Phase 2)

Every value is one of:

- a **measured fact** with `{value, source URL, checkedAt}` and the **checks** that were run against it, or
- **absent**, with an explicit reason.

There is no third state. We do not infer `firstname.lastname@domain`, we do not buy a contact
database, and we do not present a value we cannot show the evidence for.

---

## 1. The layers

| Layer | Source | Gives us | Where |
|---|---|---|---|
| 1 · Identity | Companies House | number, name, status, SIC, registered office, officers, PSCs, filings, charges, accounts | `lib/companies-house.ts` |
| 2a · Presence | Google Places | Google Business Profile, reviews, **declared website**, **declared phone** | `lib/enrichment/places.ts` |
| 2b · Website | The company's own site | verified website, emails, phones, structured data | `lib/enrichment/website.ts`, `contact.ts` |
| 3 · Verification | — | per-value checks + High/Medium/Low confidence | `lib/enrichment/contact-types.ts` |

Layer 2a already existed and is reused: when a company has a Google Business Profile, the business
has **told Google its own website and phone number**. That is a better starting point than any guess,
and it costs nothing extra because `company_enrichment` is already cached.

---

## 2. Website discovery

Two routes, tried in order of prior probability:

1. **GBP-declared website** (`places.websiteUri`) — the company told Google.
2. **Domain guessing** — `"ABC Digital Ltd"` → `abcdigital.co.uk`, `abc-digital.co.uk`,
   `abcdigital.com`, … Capped at 6 candidates, and skipped entirely when the name is too short to be
   distinctive (`"Smith Ltd"` → `smith.co.uk` is somebody else's domain with near-certainty).

Platform hosts (Facebook, LinkedIn, `business.site`, Yell, Checkatrade, Companies House mirrors) are
excluded — they are somebody else's page about the company, not the company's site.

### Verification is the whole point

A candidate is **never** accepted because it resolves. Parked domains, squatters and unrelated
businesses sit on the obvious host for a name, and a wrong website poisons every detail scraped from
it. The page has to identify itself as this company:

| Check | Weight | Why |
|---|---|---|
| Website responds | 20 | Necessary, not sufficient |
| Company name appears on the page | 25 | Every distinctive token, not just one |
| **Registered company number published on the site** | **30** | The strongest signal available — UK companies are legally required to publish it, and it cannot be coincidence |
| Registered postcode appears | 20 | Registered office ≠ trading address, so this confirms rather than proves |
| Declared on the Google Business Profile | 25 | The business told Google |

Score ≥ 65 → **high**, ≥ 45 → **medium** (the crawl threshold), below → rejected and reported as
"a candidate was found but could not be verified", never as a result.

---

## 3. What gets read

Home page + up to **three** links from it matching contact / about / team / legal patterns. The links
are taken from the page's own `<a>` elements rather than guessed (`/contact` vs `/contact-us` vs
`/get-in-touch`), so we never generate 404s on someone else's server.

Extraction, most trustworthy first (`lib/enrichment/extract.ts`):

1. **`schema.org` JSON-LD** — `Organization` / `LocalBusiness` `email` + `telephone`. Machine-declared.
2. **`mailto:` / `tel:` links** — the site author's own machine-readable markup.
3. **Visible text** — including the common obfuscations (`hello [at] example [dot] co [dot] uk`).

Phones are normalised to **E.164** (`lib/enrichment/phone.ts`), so `+44 20 1234 5678`,
`020 1234 5678` and `02012345678` are one row and one search key. Premium (`09`), personal-numbering
(`070`) and pager (`076`) ranges are dropped.

---

## 4. The confidence model

Per value (`scoreContact`):

| Check | Email | Phone |
|---|---|---|
| Syntax valid | 15 | 15 |
| Published on the company's own website | 30 | 30 |
| Domain matches the verified website | 25 | — |
| Declared in the site's structured data | 15 | 15 |
| Found on a contact page | 10 | 10 |
| Seen on more than one page or source | 15 | 15 |
| Website independently verified as this company's | 20 | 20 |
| **Mailbox / line independently verified** | **0 — never run** | **0 — never run** |

≥ 70 → High · ≥ 45 → Medium · below → Low. Scored against the maximum reachable for that kind, so
a phone is not permanently penalised for having no domain to match.

The last row matters as much as the rest. We do **not** SMTP-probe mailboxes or ring lines, and the
UI says "Mailbox not independently verified" on every record rather than letting a High badge imply a
verification we have not done. That honesty is the differentiator — it is what "Confidence: High"
means here and does not mean at a vendor who appends from a database.

---

## 5. Etiquette, legality, and the parts that could embarrass us

Everything goes through `lib/enrichment/fetch-page.ts` and nothing bypasses it.

- **Identifies itself**: `CompaniesIQBot/1.0 (+https://www.companiesiq.co.uk/bot)`, and `/bot`
  is a real page explaining what it reads, how to block it, and how to have a detail removed.
- **Obeys `robots.txt`** — including `Allow` overrides and `*`/`$` wildcards, checked before every
  request. A blocked page is reported as blocked, not skipped silently.
- **Polite**: one request at a time per host, 750 ms apart, 8 s timeout, 1.5 MB cap, ≤ 3 redirects,
  HTML only. On demand, not on a schedule, and never across a whole site.
- **SSRF-guarded**: every hop (not just the first) is DNS-resolved and refused if it lands in private,
  loopback, link-local or CGNAT space. "Fetch the customer's website" is the classic SSRF hole.
- **Suppression** (`contact_suppressions`) is applied on **read and write**, so a re-crawl cannot
  resurrect a value someone objected to. The opt-out form needs no account and asks for no
  justification — requiring either would defeat the Art. 21 right it exists to serve.

### UK GDPR / PECR position

Lawful basis: **legitimate interests** (Art. 6(1)(f)) in re-presenting business contact information
that the business published for the purpose of being contacted, with provenance attached. The
balancing test is what the design above *is*: collection limited to the company's own site, generic
business mailboxes preferred over individuals', evidence shown, 30-day TTL, and an unconditional
objection route.

Two things we say out loud rather than bury:

1. A sole trader's business number **is** personal data. The rights apply to it in full.
2. **Marketing to a detail found here is the customer's responsibility**, not ours — including PECR,
   TPS and CTPS screening. We do not screen on their behalf and do not imply we have.

---

## 6. Data model

`supabase/company-contacts.sql`:

- `company_contacts` — one row per company, 30-day TTL. **RLS on, no select policy**: unlike
  `company_enrichment` this is not world-readable, because contact details are personal data far more
  often than register facts are. Only the service role behind the plan-gated API can read it.
- `contact_suppressions` — keyed on the canonical value (lower-cased email / E.164 phone), because
  the same mobile can appear against several companies.
- `contact_lookups` — the meter: `(user_id, company_number, month)`, mirroring `report_unlocks`.

---

## 7. Packaging

| Plan | Contact discovery |
|---|---|
| Free | — |
| Analyst | 250 companies/mo |
| Team | 2,500 companies/mo |
| Enterprise | Unlimited |

Metered by **distinct company per calendar month**, not per request: re-opening a company you already
researched this month is free, which is the unit a customer thinks in. Enforced in `lib/access.ts`
(`contactAllowance` / `recordContactLookup`) — the repo's existing complaint about caps that
`lib/subscription.ts` declared and nothing enforced applies here too.

`POST /api/contacts/{number}` is a **POST** deliberately: a cache miss makes outbound requests to a
third party and spends the caller's allowance, so it must not be reachable by a crawler or a prefetch.

---

## 8. Known limits (say these before a customer finds them)

- **No JavaScript rendering.** A site that renders its footer client-side will read as having no
  contact details. Correctly reported as "found nothing", not as "has nothing".
- **Domain guessing has a low hit rate** for companies with generic names — by design. The
  alternative is confidently wrong data.
- **A registered office is not a trading address.** Places matching already gates on name similarity
  (`places.ts`), and website verification treats postcode as confirming rather than proving.
- **Coverage will be partial**, and the UI should never imply otherwise. "We checked and found
  nothing" is a true, useful answer; a fabricated `info@` is not.

## 9. Next

1. A backfill worker (reuse `worker/ingest-worker.mjs` + the `vercel.json` crons) to warm
   `company_contacts` for watchlisted companies, so a lookup is usually a cache hit.
2. Contact columns in CSV export and `GET /api/v1/companies/{number}` — same gating, same evidence.
3. Companies-House-registered-email is **not** public; do not add it.
4. Optional later: a `mx` check on the email domain (cheap, non-intrusive, adds a real check without
   touching the mailbox).
