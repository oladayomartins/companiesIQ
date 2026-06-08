"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Badge, Icon } from "@/components/ds";
import { fmtDate } from "@/lib/format";
import type { Post } from "@/lib/posts";

export function BlogAdmin({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function del(id: string, title: string) {
    if (!confirm(`Delete “${title}”? This cannot be undone.`)) return;
    setBusy(id);
    await fetch(`/api/blog/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Content</div>
          <h1 className="screen-title">Blog</h1>
        </div>
        <Link href="/app/blog/new">
          <Button variant="primary" iconLeft="plus">
            New post
          </Button>
        </Link>
      </div>

      <div className="table-scroll">
        <table className="data-table data-table--full">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Public</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {posts.length ? (
              posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/app/blog/${p.id}`} style={{ textDecoration: "none", fontWeight: 600, color: "var(--text-strong)" }}>
                      {p.title}
                    </Link>
                    <div className="cell-co__no">/{p.slug}</div>
                  </td>
                  <td>
                    <Badge tone={p.status === "published" ? "pos" : "neutral"} dot>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="mono muted">{fmtDate(p.updated_at)}</td>
                  <td>
                    {p.status === "published" ? (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" className="muted" title="View live">
                        <Icon name="external" size={15} />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="num">
                    <button className="ciq-iconbtn ciq-iconbtn--ghost ciq-iconbtn--sm" onClick={() => del(p.id, p.title)} disabled={busy === p.id} aria-label="Delete" title="Delete">
                      <Icon name="x" size={15} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="empty-row">
                <td colSpan={5}>No posts yet. Create one, or generate a draft with AI.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
