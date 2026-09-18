import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CompaniesIQ collects, uses and protects personal data, in line with UK GDPR.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <section className="pricing-hero">
        <span className="eyebrow">Legal</span>
        <h1 className="pricing-hero__title">Privacy Policy</h1>
        <p className="pricing-hero__sub">Last updated 18 September 2026. How we handle personal data under UK GDPR.</p>
      </section>

      <section className="prose">
        <h2>Who we are</h2>
        <p>
          CompaniesIQ Ltd (&ldquo;CompaniesIQ&rdquo;, &ldquo;we&rdquo;) is the data controller for personal data
          processed through this site. Company no. 14820317, London, United Kingdom. Contact:{" "}
          <a href="mailto:privacy@companiesiq.co.uk">privacy@companiesiq.co.uk</a>.
        </p>

        <h2>Company register data</h2>
        <p>
          The company information we display originates from the UK public register (Companies House) and official
          statistics (ONS, Nomis), reused under the Open Government Licence. This is public-record data, not data we
          collect from you. See <Link href="/sources">sources &amp; methodology</Link>.
        </p>

        <h2>Business contact details published on company websites</h2>
        <p>
          Our contact-intelligence feature fetches a company&apos;s own website and records the general contact details
          the company has chosen to publish there — typically a business email such as{" "}
          <span className="mono">hello@</span> or <span className="mono">info@</span> and a business telephone number —
          together with the page each one came from and the date we read it. We do not buy, licence or import contact
          data from third-party contact databases, and we do not attempt to derive or guess an individual&apos;s email
          address.
        </p>
        <ul>
          <li>
            <strong>Lawful basis</strong> — legitimate interests (Art. 6(1)(f)): re-presenting business contact
            information that the business itself published for the purpose of being contacted, with its provenance
            attached. We have balanced this against the rights of the individuals concerned, which is why we limit
            collection to what is published on the company&apos;s own site, show the evidence for every value, and
            operate the objection route below.
          </li>
          <li>
            <strong>Crawling</strong> — we identify ourselves as <span className="mono">CompaniesIQBot</span> and obey{" "}
            <span className="mono">robots.txt</span>. See <Link href="/bot">about our crawler</Link>.
          </li>
          <li>
            <strong>Sole traders and small companies</strong> — a business number or address can also be personal data.
            Where that is the case, the rights below apply to it in full.
          </li>
          <li>
            <strong>Retention</strong> — a record is re-checked or expires within 30 days; a suppressed value is
            recorded permanently as suppressed so that it is never re-published.
          </li>
        </ul>
        <p>
          <strong>Objecting (Art. 21).</strong> If you do not want a detail shown, email{" "}
          <a href="mailto:privacy@companiesiq.co.uk">privacy@companiesiq.co.uk</a> or use the removal form on{" "}
          <Link href="/bot">the crawler page</Link>. We do not require you to create an account first, and we act on
          the request rather than asking you to justify it.
        </p>
        <p>
          <strong>Marketing to these details is your responsibility.</strong> If you contact a company using details
          found here, you are the controller for that outreach and must comply with UK GDPR and PECR — including the
          rules on electronic marketing, the Corporate Telephone Preference Service (CTPS) and the Telephone
          Preference Service (TPS). We do not screen numbers against TPS/CTPS on your behalf.
        </p>

        <h2>Data we collect about you</h2>
        <ul>
          <li>
            <strong>Account</strong> — your email address, when you sign in via magic link (processed by our auth
            provider, Supabase).
          </li>
          <li>
            <strong>Billing</strong> — if you subscribe, payment is processed by Stripe; we store your subscription
            status and Stripe customer reference, never your card details.
          </li>
          <li>
            <strong>Enquiries / lead forms</strong> — the name, email and phone you submit through a report or
            visibility-review form.
          </li>
          <li>
            <strong>Analytics</strong> — privacy-conscious usage data via Google Analytics 4 (no entity-identifier
            pages, query strings stripped).
          </li>
        </ul>

        <h2>Lawful bases</h2>
        <p>
          We process account and billing data to perform our contract with you; enquiry data on the basis of your
          consent / our legitimate interest in responding; and analytics on the basis of legitimate interest in
          improving the service.
        </p>

        <h2>Sharing &amp; processors</h2>
        <p>
          We use trusted processors — Supabase (auth &amp; database), Stripe (payments), Resend (email), Vercel
          (hosting) and Google (analytics). We do not sell your personal data.
        </p>

        <h2>Your rights</h2>
        <p>
          Under UK GDPR you can request access, correction, deletion, restriction or portability of your data, and
          object to processing. Email <a href="mailto:privacy@companiesiq.co.uk">privacy@companiesiq.co.uk</a>. You may
          also complain to the ICO (ico.org.uk).
        </p>

        <h2>Retention</h2>
        <p>
          We keep account and billing records for as long as your account is active and as required by law, and remove
          enquiry data when it is no longer needed.
        </p>

        <p className="prose__note">
          This policy is provided in good faith and should be reviewed by your legal adviser before launch.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
