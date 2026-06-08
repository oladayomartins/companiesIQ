// PUBLIC cities index — links to every city landing page, grouped by region.
import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ds";
import { CITIES } from "@/lib/cities";
import { slugify } from "@/lib/slug";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "UK cities — company data by location",
  description:
    "Browse newly registered companies across major UK cities — London, Manchester, Birmingham, Leeds, Glasgow and more — with live data from Companies House.",
  alternates: { canonical: "/city" },
  openGraph: { title: "UK cities — company data by location", url: `${SITE_URL}/city`, type: "website" },
};

export default function CitiesIndex() {
  // Group cities by region for a scannable, link-rich index.
  const byRegion = new Map<string, typeof CITIES>();
  for (const c of CITIES) {
    const list = byRegion.get(c.region) ?? [];
    list.push(c);
    byRegion.set(c.region, list);
  }

  return (
    <PublicShell>
      <div className="screen">
        <div className="screen-head">
          <div>
            <div className="app-eyebrow">UK city company data</div>
            <h1 className="screen-title">Cities</h1>
          </div>
        </div>
        <p className="public-lede">
          Newly registered companies across major UK cities. Pick a city to see recent registrations and its regional
          economic context.
        </p>

        <div className="city-cols">
          {[...byRegion.entries()].map(([region, cities]) => (
            <div className="city-col" key={region}>
              <Link href={`/market/${slugify(region)}`} className="city-col__region">
                {region} <Icon name="arrowRight" size={13} />
              </Link>
              <ul className="city-col__list">
                {cities.map((c) => (
                  <li key={c.name}>
                    <Link href={`/city/${slugify(c.name)}`}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <PublicCta
          title="From city to company"
          sub="Create a free account to read a full company intelligence report, or upgrade for unlimited access."
        />
      </div>
    </PublicShell>
  );
}
