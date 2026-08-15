import Link from "next/link";
import { fmtDate } from "@/lib/format";
import type { Post } from "@/lib/posts";

// A blog post card used in the /blog grid and the "More insights" block on an
// article. Shows the cover image where the post has one, and a branded
// placeholder (the CompaniesIQ mark on a tinted gradient) where it doesn't —
// so the grid stays visually consistent even for posts without a cover.
export function BlogCard({ post, headingTag = "h2" }: { post: Post; headingTag?: "h2" | "h3" }) {
  const Title = headingTag;
  return (
    <Link href={`/blog/${post.slug}`} className="blog-tile">
      {post.cover_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="blog-tile__cover" src={post.cover_image} alt="" loading="lazy" />
      ) : (
        <div className="blog-tile__cover blog-tile__cover--ph" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/ciq-mark.svg" width={44} height={44} alt="" />
        </div>
      )}
      <div className="blog-tile__body">
        <Title className="blog-tile__title">{post.title}</Title>
        {post.excerpt ? <p className="blog-tile__excerpt">{post.excerpt}</p> : null}
        <div className="blog-tile__date mono">{fmtDate(post.published_at ?? post.created_at)}</div>
      </div>
    </Link>
  );
}
