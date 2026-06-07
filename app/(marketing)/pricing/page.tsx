import type { Metadata } from "next";
import { PricingScreen } from "@/components/marketing/PricingScreen";
import { FAQS } from "@/lib/pricing-faqs";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Pricing",
  description: "CompaniesIQ pricing — start free, then scale. Plans for analysts, teams and enterprises with API access, alerts and bulk export.",
  alternates: { canonical: "/pricing" },
};

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map(([q, a]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function PricingPage() {
  return (
    <>
      <JsonLd data={FAQ_SCHEMA} />
      <PricingScreen />
    </>
  );
}
