import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of CompaniesIQ.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="site">
      <section className="pricing-hero">
        <span className="eyebrow">Legal</span>
        <h1 className="pricing-hero__title">Terms of Service</h1>
        <p className="pricing-hero__sub">Last updated 8 June 2026. The terms governing your use of CompaniesIQ.</p>
      </section>

      <section className="prose">
        <h2>1. Agreement</h2>
        <p>
          By accessing CompaniesIQ you agree to these terms. CompaniesIQ Ltd (company no. 14820317) provides business
          intelligence derived from public data sources.
        </p>

        <h2>2. The service</h2>
        <p>
          We present information from the UK public register and official statistics. Free accounts include a limited
          number of full reports per month; paid subscriptions unlock unlimited reports, exports and alerts as described
          on the <Link href="/pricing">pricing</Link> page.
        </p>

        <h2>3. Accuracy &amp; no advice</h2>
        <p>
          Data is sourced from Companies House, ONS and Nomis and provided &ldquo;as is&rdquo;. While we take care to
          present it faithfully, we don&apos;t warrant it is complete or error-free, and nothing here is financial,
          legal or investment advice. Verify anything material against the official record.
        </p>

        <h2>4. Acceptable use</h2>
        <p>
          You may not scrape, resell or bulk-extract the service, attempt to bypass access controls, or use the data
          unlawfully (including in breach of the Open Government Licence terms for the underlying public data).
        </p>

        <h2>5. Subscriptions &amp; billing</h2>
        <p>
          Paid plans are billed via Stripe on the cycle you select and renew automatically until cancelled. You can
          cancel anytime via the billing portal; access continues until the end of the paid period.
        </p>

        <h2>6. Liability</h2>
        <p>
          To the maximum extent permitted by law, CompaniesIQ is not liable for indirect or consequential loss, and our
          total liability is limited to the fees you paid in the preceding 12 months.
        </p>

        <h2>7. Changes &amp; contact</h2>
        <p>
          We may update these terms; material changes will be posted here. Questions:{" "}
          <a href="mailto:legal@companiesiq.co.uk">legal@companiesiq.co.uk</a>.
        </p>

        <p className="prose__note">
          These terms are provided in good faith and should be reviewed by your legal adviser before launch.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
