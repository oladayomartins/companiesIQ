// PUBLIC blog index — indexable, no login. Lists published posts.
import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardBody, Icon } from "@/components/ds";
import { getPublishedPosts } from "@/lib/posts";
import { fmtDate } from "@/lib/format";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog — UK company & market intelligence",
  description:
    "Insights on UK company formation, sectors, regions and market trends from CompaniesIQ — built on Companies House, ONS and Nomis data.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "CompaniesIQ Blog", url: `${SITE_URL}/blog`, type: "website" },
};

export default async function BlogIndex() {
  const posts = await getPublishedPosts();

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    url: `${SITE_URL}/blog`,
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.published_at ?? p.created_at,
      description: p.meta_description ?? p.excerpt ?? undefined,
    })),
  };

  return (
    <PublicShell>
      <JsonLd data={blogSchema} />
      <div className="screen">
        <div className="screen-head">
          <div>
            <div className="app-eyebrow">CompaniesIQ blog</div>
            <h1 className="screen-title">Insights</h1>
          </div>
        </div>
        <p className="public-lede">
          Notes on UK company formation, sectors, regions and what the register reveals about the market.
        </p>

        {posts.length ? (
          <div className="public-grid">
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} style={{ textDecoration: "none" }}>
                <Card className="public-tile">
                  <CardBody>
                    <div className="public-tile__head">
                      <h2 className="public-tile__name">{p.title}</h2>
                      <Icon name="arrowRight" size={16} color="var(--accent)" />
                    </div>
                    {p.excerpt ? <p className="public-tile__blurb">{p.excerpt}</p> : null}
                    <div className="blog-card__date mono">{fmtDate(p.published_at ?? p.created_at)}</div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardBody>
              <p className="public-lede" style={{ margin: 0 }}>
                New articles are on the way — check back soon.
              </p>
            </CardBody>
          </Card>
        )}

        <PublicCta
          title="Put the data to work"
          sub="Create a free account to read a full company intelligence report, or upgrade for unlimited access."
        />
      </div>
    </PublicShell>
  );
}
