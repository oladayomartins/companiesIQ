// Public API documentation. Indexable: developers search for this before they
// buy, and an API you cannot read about is one nobody adopts.
import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/Footer";
import { Button } from "@/components/ds";
import { API_QUOTAS } from "@/lib/api-quotas";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "API — UK company data",
  description:
    "REST API for UK company data from the Companies House register: search, company detail, sector and region filters. Included on the CompaniesIQ Team plan.",
  alternates: { canonical: "/api-docs" },
  openGraph: { title: "CompaniesIQ API", url: `${SITE_URL}/api-docs`, type: "website" },
};

function Code({ children }: { children: string }) {
  return (
    <pre className="apidoc__code">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiDocsPage() {
  return (
    <main className="site">
      <section className="prose apidoc">
        <div className="app-eyebrow">Developers</div>
        <h1 className="apidoc__title">CompaniesIQ API</h1>
        <p>
          A REST API over the UK company register, with our sector classification and regional resolution applied.
          Included on the Team plan ({API_QUOTAS.team.toLocaleString("en-GB")} calls a month) and Enterprise (
          {API_QUOTAS.enterprise.toLocaleString("en-GB")}).
        </p>

        <h2>Authentication</h2>
        <p>
          Create a key in <Link href="/app/settings">Settings</Link>. It is shown once — store it somewhere safe, because
          we keep only a hash and cannot show it to you again. Send it as a bearer token:
        </p>
        <Code>{`curl "${SITE_URL}/api/v1/search?q=fintech&region=London" \\
  -H "Authorization: Bearer ciq_live_..."`}</Code>
        <p>
          <code>X-API-Key</code> works too. Every response carries <code>X-RateLimit-Limit</code>,{" "}
          <code>X-RateLimit-Remaining</code> and <code>X-RateLimit-Reset</code>, so you can back off without guessing.
        </p>

        <h2>Search companies</h2>
        <Code>{`GET /api/v1/search

  q       free text — company name or keyword
  sector  e.g. "Technology"
  region  e.g. "London"
  status  repeatable — active | dissolved | liquidation
  size    1–100 (default 20)
  start   offset for paging`}</Code>
        <Code>{`{
  "total": 2480,
  "count": 20,
  "start": 0,
  "results": [
    {
      "company_number": "09446231",
      "name": "Monzo Bank Limited",
      "status": "active",
      "incorporated": "2015-02-06",
      "sic_codes": ["64191"],
      "sector": "Financial services",
      "region": "London",
      "locality": "London",
      "url": "${SITE_URL}/company/09446231"
    }
  ]
}`}</Code>

        <h2>Get a company</h2>
        <Code>{`GET /api/v1/companies/{company_number}`}</Code>
        <p>
          Returns the registered office, SIC codes and sector, accounts and confirmation-statement dates, and counts of
          officers, PSCs, charges and filings.
        </p>

        <h2>Errors</h2>
        <Code>{`401  missing, invalid or revoked key
403  your plan does not include API access
404  no such company
429  monthly quota reached
502  the register is briefly unavailable — retry`}</Code>

        <h2>Limits &amp; fair use</h2>
        <p>
          Quota is counted per key, per calendar month, and resets on the 1st. Up to five active keys per account —
          revoking a key keeps its usage history for billing. Data originates from Companies House and is reused under
          the Open Government Licence v3.0; you are responsible for your own use of it.
        </p>

        <div className="apidoc__cta">
          <Button href="/pricing" variant="primary" iconRight="arrowRight">
            See plans
          </Button>
          <Button href="/app/settings" variant="secondary">
            Create a key
          </Button>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
