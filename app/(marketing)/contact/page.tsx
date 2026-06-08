import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with CompaniesIQ — sales, support, data and partnership enquiries.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main className="site">
      <section className="pricing-hero">
        <span className="eyebrow">Contact</span>
        <h1 className="pricing-hero__title">Get in touch.</h1>
        <p className="pricing-hero__sub">Questions about the data, a plan, or a partnership? We&apos;d love to hear from you.</p>
      </section>

      <section className="prose">
        <h2>Email</h2>
        <ul>
          <li>
            Sales &amp; plans — <a href="mailto:sales@companiesiq.co.uk">sales@companiesiq.co.uk</a>
          </li>
          <li>
            Support — <a href="mailto:support@companiesiq.co.uk">support@companiesiq.co.uk</a>
          </li>
          <li>
            Data &amp; partnerships — <a href="mailto:hello@companiesiq.co.uk">hello@companiesiq.co.uk</a>
          </li>
        </ul>

        <h2>Already exploring?</h2>
        <p>
          You can browse <Link href="/industry">industries</Link>, <Link href="/market">markets</Link> and{" "}
          <Link href="/city">cities</Link> for free, or <Link href="/sign-in">create a free account</Link> to read a
          full company intelligence report.
        </p>

        <h2>Company</h2>
        <p>
          CompaniesIQ Ltd · Company no. 14820317 · London, United Kingdom.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
