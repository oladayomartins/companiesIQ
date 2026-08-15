// PUBLIC blog index — indexable, no login. Lists published posts, paginated.
// Lives in the (marketing) route group so it inherits the light SiteHeader and
// matches the homepage chrome (not the dark public-report shell) — one nav.
import Link from "next/link";
import type { Metadata } from "next";
import { getPublishedPosts } from "@/lib/posts";
import { BlogCard } from "@/components/marketing/BlogCard";
import { PublicCta } from "@/components/public/PublicShell";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 300;

const PER_PAGE = 12;

function pageParam(sp: Record<string, string | string[] | undefined>): number {
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const page = pageParam(await searchParams);
  const suffix = page > 1 ? ` (page ${page})` : "";
  return {
    title: `Blog — UK company & market intelligence${suffix}`,
    description:
      "Insights on UK company formation, sectors, regions and market trends from CompaniesIQ — built on Companies House, ONS and Nomis data.",
    // Self-referencing canonical per page so paginated pages aren't treated as
    // duplicates of page 1.
    alternates: { canonical: page > 1 ? `/blog?page=${page}` : "/blog" },
    openGraph: { title: "CompaniesIQ Blog", url: `${SITE_URL}/blog`, type: "website" },
  };
}

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const posts = await getPublishedPosts();
  const totalPages = Math.max(1, Math.ceil(posts.length / PER_PAGE));
  const page = Math.min(pageParam(await searchParams), totalPages);
  const start = (page - 1) * PER_PAGE;
  const pagePosts = posts.slice(start, start + PER_PAGE);

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

  const hrefFor = (n: number) => (n <= 1 ? "/blog" : `/blog?page=${n}`);

  return (
    <main className="site">
      <JsonLd data={blogSchema} />

      <section className="pricing-hero">
        <span className="eyebrow">Blog</span>
        <h1 className="pricing-hero__title">Insights</h1>
        <p className="pricing-hero__sub">
          Notes on UK company formation, sectors, regions and what the register reveals about the market.
        </p>
      </section>

      <section className="blog-index">
        {pagePosts.length ? (
          <>
            <div className="public-grid">
              {pagePosts.map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>

            {totalPages > 1 ? (
              <nav className="blog-pagination" aria-label="Blog pagination">
                {page > 1 ? (
                  <Link className="blog-pagination__nav" href={hrefFor(page - 1)} rel="prev">
                    ← Newer
                  </Link>
                ) : (
                  <span className="blog-pagination__nav is-disabled">← Newer</span>
                )}
                <div className="blog-pagination__pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <Link
                      key={n}
                      href={hrefFor(n)}
                      className={"blog-pagination__page" + (n === page ? " is-active" : "")}
                      aria-current={n === page ? "page" : undefined}
                    >
                      {n}
                    </Link>
                  ))}
                </div>
                {page < totalPages ? (
                  <Link className="blog-pagination__nav" href={hrefFor(page + 1)} rel="next">
                    Older →
                  </Link>
                ) : (
                  <span className="blog-pagination__nav is-disabled">Older →</span>
                )}
              </nav>
            ) : null}
          </>
        ) : (
          <p className="public-lede" style={{ margin: 0 }}>
            New articles are on the way — check back soon.
          </p>
        )}

        <PublicCta
          title="Put the data to work"
          sub="Create a free account to read a full company intelligence report, or upgrade for unlimited access."
        />
      </section>

      <SiteFooter />
    </main>
  );
}
