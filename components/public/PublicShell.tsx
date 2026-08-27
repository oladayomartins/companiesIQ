import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/Footer";
import { PublicCtaBody } from "@/components/public/PublicAuthCtas";

// The shell for every PUBLIC page that isn't marketing — industries, markets,
// cities, signals, search.
//
// Theme by ACCESS, not by data density. Anything a visitor can reach without
// signing in wears the light site chrome: same header, same footer, same
// palette as the homepage. The dark theme belongs exclusively to the signed-in
// app (/app), where it is the visual signal that you have crossed from the
// public site into the workspace. Density is not a reason to go dark — a page
// full of figures is still a public page.
//
// Previously these pages rendered their own dark header and dropped the site
// nav and footer entirely, which made /industry and /market read as a different
// product from the homepage that links to them.
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site public-page">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content">{children}</main>
      <SiteFooter />
    </div>
  );
}

// A reusable bottom-of-page conversion band for the SEO landing pages. The band
// itself stays dark — it is the one sanctioned dark element on a light page,
// shared with the marketing archetype so both end identically.
export function PublicCta({ title, sub, ctaLabel }: { title: string; sub: string; ctaLabel?: string }) {
  return (
    <div className="public-cta">
      <h2 className="public-cta__title">{title}</h2>
      <PublicCtaBody sub={sub} ctaLabel={ctaLabel} />
    </div>
  );
}
