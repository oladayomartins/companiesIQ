// Signal metadata for the public /signals SEO pages. The canonical theme list
// lives in lib/keywords.ts (KEYWORDS); this adds a search term + a short,
// human description per theme for the landing pages.
import { KEYWORDS } from "@/lib/keywords";
import { slugify } from "@/lib/slug";

interface SignalMeta {
  term: string; // Companies House search term that best surfaces the theme
  blurb: string;
}

const META: Record<string, SignalMeta> = {
  AI: { term: "artificial intelligence", blurb: "UK companies building or applying artificial intelligence, machine learning and generative AI." },
  Fintech: { term: "fintech", blurb: "Financial-technology companies: payments, lending, banking and money infrastructure." },
  Crypto: { term: "blockchain", blurb: "Blockchain, web3, digital-asset and decentralised-finance companies registered in the UK." },
  SaaS: { term: "software", blurb: "Software-as-a-service and cloud platform companies across the UK register." },
  Cybersecurity: { term: "cyber security", blurb: "Cybersecurity, infosec and threat-defence companies protecting UK organisations." },
  Healthcare: { term: "healthcare", blurb: "Healthcare, medical, clinical and biotech companies registered in the UK." },
  Care: { term: "care services", blurb: "Domiciliary care, homecare and nursing providers — one of the fastest-forming sectors." },
  Recruitment: { term: "recruitment", blurb: "Recruitment, staffing and talent companies hiring across the UK economy." },
  Property: { term: "property", blurb: "Property, estate, lettings and real-estate companies registered in the UK." },
  Construction: { term: "construction", blurb: "Construction, building and trades companies — a high-volume formation sector." },
  Solar: { term: "solar", blurb: "Solar, photovoltaic and renewable-generation companies in the UK." },
  Cleantech: { term: "sustainability", blurb: "Cleantech, green-energy and carbon-reduction companies." },
  Energy: { term: "energy", blurb: "Energy, power and heat companies across generation and supply." },
  Ecommerce: { term: "ecommerce", blurb: "Online retail, marketplace and direct-to-consumer commerce companies." },
  Logistics: { term: "logistics", blurb: "Logistics, courier, delivery and fulfilment companies powering UK trade." },
  Marketing: { term: "marketing agency", blurb: "Marketing, advertising, media and brand agencies registered in the UK." },
  Consulting: { term: "consulting", blurb: "Consulting and advisory firms across management, tech and finance." },
  Hospitality: { term: "hospitality", blurb: "Restaurants, cafés, catering and hospitality companies." },
  Automotive: { term: "automotive", blurb: "Automotive, vehicle and EV-charging companies in the UK." },
  Education: { term: "education", blurb: "Education, training, tutoring and edtech companies." },
  Beauty: { term: "beauty", blurb: "Beauty, aesthetics, salon and cosmetics companies — a high-formation sector." },
  Legal: { term: "legal services", blurb: "Legal, solicitor and conveyancing firms registered in the UK." },
};

export interface Signal {
  key: string;
  slug: string;
  term: string;
  blurb: string;
}

export const SIGNALS: Signal[] = KEYWORDS.map((k) => ({
  key: k.key,
  slug: slugify(k.key),
  term: META[k.key]?.term ?? k.key.toLowerCase(),
  blurb: META[k.key]?.blurb ?? `UK companies in the ${k.key} space.`,
}));

export function signalForSlug(slug: string): Signal | null {
  return SIGNALS.find((s) => s.slug === slug) ?? null;
}
