// PUBLIC blog post — indexable, no login. Article + FAQPage + Breadcrumb schema
// for SEO/AEO; markdown body; internal links to live pages. Lives in the
// (marketing) route group so it inherits the light SiteHeader and matches the
// homepage chrome (not the dark public-report shell).
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Icon } from "@/components/ds";
import { getPublishedPostBySlug, getPublishedPosts, type Post } from "@/lib/posts";
import { renderArticle, readingMinutes } from "@/lib/markdown";
import { fmtDate } from "@/lib/format";
import { BlogCard } from "@/components/marketing/BlogCard";
import { PublicCta } from "@/components/public/PublicShell";
import { SiteFooter } from "@/components/marketing/Footer";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { getDataset } from "@/lib/research/store";
import { datasetLd, researchArticleExtras } from "@/lib/research/schema";
import { ResearchProvenance } from "@/components/marketing/ResearchProvenance";

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

  // The template, not each author, guarantees the structure: anchors and a
  // contents list from the H2s, a takeaways box (the post's own field, or a
  // "## Key takeaways" list lifted out of the body), reading time.
  const { html, headings, liftedTakeaways, wordCount } = renderArticle(post.body_md);
  const takeaways = post.key_takeaways.length ? post.key_takeaways : liftedTakeaways;
  const toc = headings.filter((h) => h.level === 2);
  const minutes = readingMinutes(wordCount);
  const published = post.published_at ?? post.created_at;
  // Only call it "updated" when it materially was — a same-day typo fix isn't news.
  const updated = Date.parse(post.updated_at) - Date.parse(published) > 86_400_000 ? post.updated_at : null;
  // The byline is a team name; an email address (old CMS saves) is never shown.
  const byline = post.author && !post.author.includes("@") ? post.author : "CompaniesIQ Research";

  // A research edition carries the dataset that produced its figures. When one
  // exists, the page also serves it: provenance above the article, Dataset
  // structured data, and CSV/JSON downloads.
  const dataset = await getDataset(post.slug).catch(() => null);

  // "More insights" — real post cards (with covers). Prefer the posts this
  // article links to in `related`, then top up with the most recent, excluding
  // the current article. The non-post `related` links (product pages) stay as
  // chips below.
  const allPosts = await getPublishedPosts();
  const bySlug = new Map(allPosts.map((p) => [p.slug, p]));
  const relatedSlugs = (post.related ?? [])
    .filter((r) => r.href.startsWith("/blog/"))
    .map((r) => r.href.slice("/blog/".length));
  const morePosts: Post[] = [];
  const taken = new Set<string>([post.slug]);
  for (const s of relatedSlugs) {
    const p = bySlug.get(s);
    if (p && !taken.has(p.slug)) {
      morePosts.push(p);
      taken.add(p.slug);
    }
  }
  for (const p of allPosts) {
    if (morePosts.length >= 3) break;
    if (!taken.has(p.slug)) {
      morePosts.push(p);
      taken.add(p.slug);
    }
  }
  const moreToShow = morePosts.slice(0, 3);
  const relatedChips = (post.related ?? []).filter((r) => !r.href.startsWith("/blog/"));

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.meta_description ?? post.excerpt ?? undefined,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
    inLanguage: "en-GB",
    isAccessibleForFree: true,
    wordCount,
    timeRequired: `PT${minutes}M`,
    // The takeaways are the article's own summary — the field search engines and
    // AI assistants read for "what does this page conclude".
    ...(takeaways.length ? { abstract: takeaways.join(" ") } : post.excerpt ? { abstract: post.excerpt } : {}),
    // Points voice assistants / answer engines at the summary, not the chrome.
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: [".blog-post__title", takeaways.length ? ".blog-takeaways" : ".blog-post__lede"],
    },
    author: { "@type": "Organization", name: byline, url: `${SITE_URL}/about` },
    publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: `${SITE_URL}/logo/ciq-mark.svg` } },
    ...(post.cover_image ? { image: post.cover_image } : {}),
    ...(dataset ? researchArticleExtras(dataset) : {}),
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

  const schemas = [articleSchema, breadcrumb, ...(faqSchema ? [faqSchema] : []), ...(dataset ? [datasetLd(dataset)] : [])];

  return (
    <main className="site" id="main-content" tabIndex={-1}>
      <JsonLd data={schemas} />
      <article className="blog-post blog-article">
        <Link className="back" href="/blog">
          <Icon name="arrowRight" size={15} style={{ transform: "rotate(180deg)" }} /> All articles
        </Link>

        <header className="blog-post__head">
          <div className="eyebrow">CompaniesIQ blog</div>
          <h1 className="blog-post__title">{post.title}</h1>
          {post.excerpt ? <p className="blog-post__lede">{post.excerpt}</p> : null}
          <div className="blog-post__meta mono">
            <span>By {byline}</span>
            <span>
              Published <time dateTime={published}>{fmtDate(published)}</time>
            </span>
            {updated ? (
              <span>
                Updated <time dateTime={updated}>{fmtDate(updated)}</time>
              </span>
            ) : null}
            <span>{minutes} min read</span>
          </div>
        </header>

        {dataset ? <ResearchProvenance dataset={dataset} /> : null}

        {takeaways.length ? (
          <aside className="blog-takeaways" aria-labelledby="key-takeaways">
            <h2 className="blog-takeaways__title" id="key-takeaways">
              Key takeaways
            </h2>
            <ul className="blog-takeaways__list">
              {takeaways.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </aside>
        ) : null}

        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="blog-post__cover" src={post.cover_image} alt="" />
        ) : null}

        {toc.length >= 3 ? (
          <nav className="blog-toc" aria-labelledby="in-this-article">
            <h2 className="blog-toc__title" id="in-this-article">
              In this article
            </h2>
            <ol className="blog-toc__list">
              {toc.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`}>{h.text}</a>
                </li>
              ))}
              {post.faq?.length ? (
                <li>
                  <a href="#faq">Frequently asked questions</a>
                </li>
              ) : null}
            </ol>
          </nav>
        ) : null}

        <div className="prose blog-prose" dangerouslySetInnerHTML={{ __html: html }} />

        {post.faq && post.faq.length ? (
          <section className="blog-faq" aria-labelledby="faq">
            <h2 className="blog-faq__title" id="faq">
              Frequently asked questions
            </h2>
            {post.faq.map((f, i) => (
              <div className="blog-faq__item" key={i}>
                <h3 className="blog-faq__q">{f.q}</h3>
                <p className="blog-faq__a">{f.a}</p>
              </div>
            ))}
          </section>
        ) : null}

        <aside className="blog-about" aria-label="About this article">
          <div className="blog-about__head">About this article</div>
          <p>
            Written by {byline}. CompaniesIQ articles draw on public registers — Companies House, ONS and Nomis — and
            attribute the figures they use to those sources. <Link href="/sources">How we source our data</Link>.
          </p>
        </aside>

        {relatedChips.length ? (
          <div className="blog-related">
            <div className="eyebrow" style={{ marginBottom: 10 }}>Related</div>
            <div className="signal-chips">
              {relatedChips.map((r, i) => (
                <Link key={i} href={r.href} className="signal-chip">
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {moreToShow.length ? (
          <section className="blog-more">
            <h2 className="blog-more__title">More insights</h2>
            <div className="public-grid">
              {moreToShow.map((p) => (
                <BlogCard key={p.id} post={p} headingTag="h3" />
              ))}
            </div>
          </section>
        ) : null}

        <PublicCta
          title="Go from reading to research"
          sub="Create a free account to read a full company intelligence report, or upgrade for unlimited access."
        />
      </article>

      <SiteFooter />
    </main>
  );
}
