import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/Footer";
import { SuppressForm } from "@/components/marketing/SuppressForm";

// The page CompaniesIQBot's user-agent string points at. A site owner who sees
// an unfamiliar crawler in their logs should be one click from knowing exactly
// who it is, what it took, and how to stop it — so this page is the whole
// answer, including the removal form, with nothing behind an account.
export const metadata: Metadata = {
  title: "CompaniesIQBot — about our crawler",
  description:
    "What CompaniesIQBot is, what it reads, how to block it, and how to have a published contact detail removed from CompaniesIQ.",
  alternates: { canonical: "/bot" },
};

export default function BotPage() {
  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <section className="pricing-hero">
        <span className="eyebrow">Our crawler</span>
        <h1 className="pricing-hero__title">CompaniesIQBot</h1>
        <p className="pricing-hero__sub">
          What it is, what it reads, how to block it, and how to have a detail removed.
        </p>
      </section>

      <section className="prose">
        <h2>What it is</h2>
        <p>
          CompaniesIQBot fetches a small number of pages from a company&apos;s own website when a CompaniesIQ customer
          researches that company, so that we can show the contact details the company publishes about itself alongside
          the evidence for each one. It identifies itself as:
        </p>
        <pre className="mono">CompaniesIQBot/1.0 (+https://www.companiesiq.co.uk/bot)</pre>

        <h2>What it reads</h2>
        <ul>
          <li>The home page, and up to three pages linked from it that look like contact, about, team or legal pages.</li>
          <li>
            From those pages: the business email addresses and telephone numbers published on them, plus any{" "}
            <span className="mono">schema.org</span> organisation markup.
          </li>
          <li>Nothing else. We do not index your content, copy your copy, or train models on it.</li>
        </ul>

        <h2>How it behaves</h2>
        <ul>
          <li>
            It reads and obeys <span className="mono">robots.txt</span> before every request, including{" "}
            <span className="mono">Allow</span> overrides.
          </li>
          <li>One request at a time per host, with a delay between requests. It is not a bulk crawl.</li>
          <li>It follows at most three redirects, gives up after eight seconds, and only accepts HTML.</li>
          <li>It runs on demand when a customer researches your company — not on a schedule, and not across your whole site.</li>
        </ul>

        <h2>Blocking it</h2>
        <p>Add this to your robots.txt and we will stop, on the next request:</p>
        <pre className="mono">{`User-agent: CompaniesIQBot\nDisallow: /`}</pre>
        <p>
          Blocking the crawler stops us reading your site. It does not remove details we have already recorded — use
          the form below for that.
        </p>

        <h2>Removing a detail</h2>
        <p>
          If you would rather a published email address or phone number was not shown on CompaniesIQ, tell us here. We
          do not ask you to create an account, and we do not ask you to justify the request. The value is added to a
          permanent suppression list, so a later re-read of your site cannot bring it back.
        </p>
        <SuppressForm />

        <h2>Anything else</h2>
        <p>
          Email <a href="mailto:privacy@companiesiq.co.uk">privacy@companiesiq.co.uk</a>. See also our{" "}
          <Link href="/privacy">privacy policy</Link> and <Link href="/sources">sources &amp; methodology</Link>.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
