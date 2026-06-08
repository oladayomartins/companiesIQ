import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "About",
  description:
    "CompaniesIQ turns the UK public business register into market intelligence you can search, track and trust — built on Companies House, ONS and Nomis open data.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="site">
      <section className="pricing-hero">
        <span className="eyebrow">About</span>
        <h1 className="pricing-hero__title">Know every UK company.</h1>
        <p className="pricing-hero__sub">
          CompaniesIQ turns the UK&apos;s public business register into market intelligence anyone can search, track and
          trust — 5.3 million live companies, one source of truth.
        </p>
      </section>

      <section className="prose">
        <h2>What we do</h2>
        <p>
          Every company in the UK files with Companies House, but that data is hard to use. We classify, enrich and
          connect it with official economic statistics so founders, analysts and teams can understand a company, a
          sector or a region in seconds — not hours.
        </p>

        <h2>Where the data comes from</h2>
        <p>
          Everything is real and sourced. We pull live from Companies House, the ONS and Nomis, and clearly label any
          figure that comes from a published reference baseline. We never fabricate numbers. You can read exactly what
          powers each figure on our <Link href="/sources">sources &amp; methodology</Link> page.
        </p>

        <h2>Explore</h2>
        <p>
          Start with an <Link href="/industry">industry</Link>, a <Link href="/market">regional market</Link>, a{" "}
          <Link href="/city">city</Link>, or an emerging <Link href="/signals">signal</Link> — or jump straight to any{" "}
          company&apos;s full report. See <Link href="/pricing">plans</Link> when you&apos;re ready for unlimited
          intelligence.
        </p>

        <h2>Who we are</h2>
        <p>
          CompaniesIQ Ltd is registered in England &amp; Wales (company no. 14820317), based in London. Building
          something with us or want to talk? <Link href="/contact">Get in touch</Link>.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
