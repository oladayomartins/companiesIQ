// PUBLIC blog post — indexable, no login. Article + FAQPage + Breadcrumb schema
// for SEO/AEO; markdown body; internal links to live pages.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardBody, Icon } from "@/components/ds";
import { getPublishedPostBySlug } from "@/lib/posts";
import { renderMarkdown } from "@/lib/markdown";
import { fmtDate } from "@/lib/format";
import { PublicShell, PublicCta } from "@/components/public/PublicShell";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Article" };
  const desc = post.meta_description ?? post.excerpt ?? `${post.title} — CompaniesIQ.`;
  return {
    title: post.title,
    description: desc,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: desc,
      url: `${SITE_URL}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.published_at ?? post.created_at,
      ...(post.cover_image ? { images: [post.cover_image] } : {}),
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const html = renderMarkdown(post.body_md);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo/ciq-mark.svg` } },
    ...(post.cover_image ? { image: post.cover_image } : {}),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 2, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };
  const faqSchema =
    post.faq && post.faq.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null;

  return (
    <PublicShell>
      <JsonLd data={faqSchema ? [articleSchema, breadcrumb, faqSchema] : [articleSchema, breadcrumb]} />
      <article className="screen blog-post">
        <Link className="back" href="/blog">
          <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> All articles
        </Link>

        <header className="blog-post__head">
          <div className="app-eyebrow">CompaniesIQ blog</div>
          <h1 className="blog-post__title">{post.title}</h1>
          <div className="blog-post__meta mono">{fmtDate(post.published_at ?? post.created_at)}</div>
        </header>

        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="blog-post__cover" src={post.cover_image} alt="" />
        ) : null}

        <div className="prose blog-prose" dangerouslySetInnerHTML={{ __html: html }} />

        {post.faq && post.faq.length ? (
          <section className="blog-faq">
            <h2 className="section__title">Frequently asked questions</h2>
            {post.faq.map((f, i) => (
              <div className="blog-faq__item" key={i}>
                <h3 className="blog-faq__q">{f.q}</h3>
                <p className="blog-faq__a">{f.a}</p>
              </div>
            ))}
          </section>
        ) : null}

        {post.related && post.related.length ? (
          <Card className="blog-related">
            <CardBody>
              <div className="app-eyebrow" style={{ marginBottom: 10 }}>Related</div>
              <div className="signal-chips">
                {post.related.map((r, i) => (
                  <Link key={i} href={r.href} className="signal-chip">
                    {r.label}
                  </Link>
                ))}
              </div>
            </CardBody>
          </Card>
        ) : null}

        <PublicCta
          title="Go from reading to research"
          sub="Create a free account to read a full company intelligence report, or upgrade for unlimited access."
        />
      </article>
    </PublicShell>
  );
}
