"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ds";
import { ALERT_SECTORS } from "@/lib/alert-options";
import { CITIES } from "@/lib/cities";
import { track } from "@/lib/track";
import { marketSearchHref } from "@/lib/market-link";

// The business-leads page's "do it now" step: pick a sector and a city and land
// straight on the prospect-list search (/search frames it with live counts and
// Save / weekly alert / export). No sign-up needed to see the list — the
// account ask comes when they want more of it.
export function LeadListBuilder({ defaultSector = "Construction", defaultCity = "Manchester" }: { defaultSector?: string; defaultCity?: string } = {}) {
  const router = useRouter();
  const [sector, setSector] = useState(defaultSector);
  const [city, setCity] = useState(defaultCity);
  const [fresh, setFresh] = useState(true);

  function go(e: React.FormEvent) {
    e.preventDefault();
    // The search page records the search itself (intent-classified); GA just
    // needs to know the builder was the way in.
    track("lead_builder", { sector: sector || "any", city: city || "uk", fresh });
    // Structured filters, not a sentence: "Newcastle upon Tyne" parsed as text
    // becomes a town plus a name fragment and returns the wrong list.
    if (!sector && !city) {
      router.push(`/search?q=${encodeURIComponent(fresh ? "new companies" : "companies")}`);
      return;
    }
    router.push(marketSearchHref({ sector: sector || undefined, place: city || undefined, incorporated: fresh ? "12m" : undefined, from: "lead-builder" }));
  }

  return (
    <form className="lead-builder" onSubmit={go} aria-label="Build a lead list">
      <label className="lead-builder__field">
        <span className="mono">Industry</span>
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          {ALERT_SECTORS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value ? o.label : "Any industry"}
            </option>
          ))}
        </select>
      </label>
      <label className="lead-builder__field">
        <span className="mono">Location</span>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Anywhere in the UK</option>
          {CITIES.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="lead-builder__check">
        <input type="checkbox" checked={fresh} onChange={(e) => setFresh(e.target.checked)} />
        <span>Newly registered only</span>
      </label>
      <Button type="submit" variant="primary" size="lg" iconRight="arrowRight">
        Build my lead list
      </Button>
    </form>
  );
}
