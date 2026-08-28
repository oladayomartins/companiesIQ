"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Badge, Icon, Card } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { BillingToggle } from "@/components/marketing/BillingToggle";
import { PRICING_TIERS, type Plan } from "@/lib/subscription";
import { FAQS } from "@/lib/pricing-faqs";

function PricingTier({ tier, annual, onChoose, busy }: { tier: Plan; annual: boolean; onChoose: () => void; busy: boolean }) {
  const custom = tier.monthly === null;
  const free = tier.monthly === 0;
  // What it actually costs to say out loud, rather than only the /mo equivalent.
  const billed = custom
    ? "Annual contract"
    : free
      ? "free forever · no card"
      : annual
        ? tier.annualTotal
          ? `£${tier.annualTotal.toLocaleString("en-GB")} per user, billed once a year`
          : "billed annually"
        : "billed monthly";
  return (
    <Card className={"tier" + (tier.popular ? " tier--popular" : "")} variant={tier.popular ? "raised" : "default"}>
      <div className="tier__inner">
        {/* Rendered on every card, badge or not: when only the popular card
            carried it, that column's name, price and CTA sat 38px lower than
            its neighbours' and the row could not be read across. */}
        <div className="tier__flag">{tier.popular ? <Badge tone="accent">Most popular</Badge> : null}</div>
        <div className="tier__name">{tier.name}</div>
        <div className="tier__tag">{tier.tagline}</div>
        <div className="tier__price">
          {custom ? (
            <span className="tier__custom">Custom</span>
          ) : (
            <>
              <span className="tier__amt">£{annual ? tier.annual : tier.monthly}</span>
              {free ? null : <span className="tier__per mono">/user/mo</span>}
            </>
          )}
        </div>
        <div className="tier__billed mono">{billed}</div>
        <Button variant={tier.ctaVariant} block iconRight={custom ? undefined : "arrowRight"} onClick={onChoose} disabled={busy}>
          {busy ? "One moment…" : tier.cta}
        </Button>
        <ul className="tier__feats">
          {tier.features.map((f) => (
            <li key={f}>
              <Icon name="check" size={16} color="var(--accent)" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export function PricingScreen() {
  const params = useSearchParams();
  const [annual, setAnnual] = useState(params.get("interval") !== "monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resumed = useRef(false);

  // Coming back from sign-in with a plan in the URL: finish what they started.
  // Runs once — a failed resume must not trap them in a redirect loop, so on
  // failure we fall through to the normal table with the reason shown.
  useEffect(() => {
    if (resumed.current) return;
    const wanted = params.get("plan");
    if (!wanted) return;
    const tier = PRICING_TIERS.find((t) => t.id === wanted);
    if (!tier || tier.monthly === null || tier.monthly === 0) return;
    resumed.current = true;
    void choose(tier, { resuming: true });
    // choose() is stable for this purpose; re-running on every render would
    // restart checkout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function choose(tier: Plan, opts: { resuming?: boolean } = {}) {
    // Enterprise is sales-led — no self-serve checkout.
    if (tier.monthly === null) {
      window.location.href = "mailto:sales@companiesiq.co.uk?subject=CompaniesIQ%20Enterprise";
      return;
    }
    // Free has nothing to charge for — it just needs an account.
    if (tier.monthly === 0) {
      window.location.href = "/sign-in?next=/app";
      return;
    }
    setBusy(tier.id);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: tier.id, interval: annual ? "annual" : "monthly" }),
      });
      if (res.status === 401) {
        if (opts.resuming) {
          // We just came back from sign-in and are still unauthenticated —
          // bouncing again would loop. Say so and let them retry by hand.
          setError("Your sign-in didn't carry over. Choose your plan again to continue.");
          return;
        }
        // Carry the choice through the auth round-trip. Sending them back to a
        // bare /pricing made them pick the same plan a second time, which reads
        // as though the first click did nothing.
        const resume = `/pricing?plan=${tier.id}&interval=${annual ? "annual" : "monthly"}`;
        window.location.href = `/sign-in?next=${encodeURIComponent(resume)}`;
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || "Subscriptions aren't available yet.");
    } catch {
      setError("Something went wrong starting checkout.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <section className="pricing-hero">
        <span className="eyebrow">Pricing</span>
        <h1 className="pricing-hero__title">Plans that scale with the register.</h1>
        <p className="pricing-hero__sub">Start free. Upgrade when you need to track companies, get signals and export at scale.</p>
        <BillingToggle annual={annual} onChange={setAnnual} />
      </section>

      <section className="tiers">
        {PRICING_TIERS.map((t) => (
          <PricingTier key={t.id} tier={t} annual={annual} onChoose={() => choose(t)} busy={busy === t.id} />
        ))}
      </section>
      {error ? (
        <p className="pricing-error" role="alert" style={{ textAlign: "center", color: "var(--neg)", marginTop: 16 }}>
          {error}
        </p>
      ) : null}

      <section className="faq">
        <div className="section__head">
          <span className="eyebrow">Questions</span>
          <h2 className="section__title">Good to know.</h2>
        </div>
        <div className="faq-grid">
          {FAQS.map(([q, a]) => (
            <div className="faq-item" key={q}>
              <h3 className="faq-item__q">{q}</h3>
              <p className="faq-item__a">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
