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
    <main className="site">
      <section className="pricing-hero">
        <span className="eyebrow">Legal</span>
        <h1 className="pricing-hero__title">Privacy Policy</h1>
        <p className="pricing-hero__sub">Last updated 8 June 2026. How we handle personal data under UK GDPR.</p>
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
