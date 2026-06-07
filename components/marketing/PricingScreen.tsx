"use client";
import { useState } from "react";
import { Button, Badge, Icon, Switch, Card } from "@/components/ds";
import { SiteFooter } from "@/components/marketing/Footer";
import { MARKETING_TIERS, type Plan } from "@/lib/subscription";
import { FAQS } from "@/lib/pricing-faqs";

function PricingTier({ tier, annual }: { tier: Plan; annual: boolean }) {
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
        <Button variant={tier.ctaVariant} block iconRight={custom ? undefined : "arrowRight"}>
          {tier.cta}
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
          <PricingTier key={t.id} tier={t} annual={annual} />
        ))}
      </section>

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
