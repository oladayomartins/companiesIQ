"use client";
import { useState } from "react";
import { Button, Badge, Icon, Switch, Card } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { MARKETING_TIERS, type Plan } from "@/lib/subscription";
import { FAQS } from "@/lib/pricing-faqs";

function PricingTier({ tier, annual, onChoose, busy }: { tier: Plan; annual: boolean; onChoose: () => void; busy: boolean }) {
  const custom = tier.monthly === null;
  return (
    <Card className={"tier" + (tier.popular ? " tier--popular" : "")} variant={tier.popular ? "raised" : "default"}>
      <div className="tier__inner">
        {tier.popular ? (
          <div className="tier__flag">
            <Badge tone="accent">Most popular</Badge>
          </div>
        ) : null}
        <div className="tier__name">{tier.name}</div>
        <div className="tier__tag">{tier.tagline}</div>
        <div className="tier__price">
          {custom ? (
            <span className="tier__custom">Custom</span>
          ) : (
            <>
              <span className="tier__amt">£{annual ? tier.annual : tier.monthly}</span>
              <span className="tier__per mono">/user/mo</span>
            </>
          )}
        </div>
        <div className="tier__billed mono">{custom ? "Annual contract" : annual ? "billed annually" : "billed monthly"}</div>
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
  const [annual, setAnnual] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(tier: Plan) {
    // Enterprise is sales-led — no self-serve checkout.
    if (tier.monthly === null) {
      window.location.href = "mailto:sales@companiesiq.co.uk?subject=CompaniesIQ%20Enterprise";
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
        window.location.href = "/sign-in?next=/pricing";
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
    <main className="site">
      <section className="pricing-hero">
        <span className="eyebrow">Pricing</span>
        <h1 className="pricing-hero__title">Plans that scale with the register.</h1>
        <p className="pricing-hero__sub">Start free. Upgrade when you need to track companies, get signals and export at scale.</p>
        <div className="bill-toggle">
          <span className={!annual ? "is-on" : ""}>Monthly</span>
          <Switch checked={annual} onChange={(e) => setAnnual(e.target.checked)} />
          <span className={annual ? "is-on" : ""}>Annual</span>
          <Badge tone="pos">Save 20%</Badge>
        </div>
      </section>

      <section className="tiers">
        {MARKETING_TIERS.map((t) => (
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
