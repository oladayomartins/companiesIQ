"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Badge, Icon } from "@/components/ds";
import { slugify } from "@/lib/slug";
import type { Post, FaqItem, RelatedLink } from "@/lib/posts";

interface FormState {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  meta_description: string;
  cover_image: string;
  body_md: string;
  faq: FaqItem[];
  related: RelatedLink[];
  status: "draft" | "published";
}

function fromPost(p: Post | null): FormState {
  return {
    id: p?.id,
    title: p?.title ?? "",
    slug: p?.slug ?? "",
    excerpt: p?.excerpt ?? "",
    meta_description: p?.meta_description ?? "",
    cover_image: p?.cover_image ?? "",
    body_md: p?.body_md ?? "",
    faq: p?.faq ?? [],
    related: p?.related ?? [],
    status: p?.status ?? "draft",
  };
}

export function BlogEditor({ initial }: { initial: Post | null }) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(fromPost(initial));
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<null | "gen" | "save" | "publish">(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function generate() {
    if (!topic.trim()) {
      setError("Enter a topic for the AI to draft.");
      return;
    }
    setBusy("gen");
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Generation failed.");
        return;
      }
      const d = data.draft as Partial<FormState>;
      setF((prev) => ({
        ...prev,
        title: d.title ?? prev.title,
        slug: d.slug ?? prev.slug,
        excerpt: d.excerpt ?? prev.excerpt,
        meta_description: d.meta_description ?? prev.meta_description,
        body_md: d.body_md ?? prev.body_md,
        faq: (d.faq as FaqItem[]) ?? prev.faq,
        related: (d.related as RelatedLink[]) ?? prev.related,
      }));
      setInfo("Draft generated — review and edit before publishing.");
    } catch {
      setError("Generation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function save(status: "draft" | "published") {
    if (!f.title.trim()) {
      setError("Title is required.");
      return;
    }
    const slug = f.slug.trim() || slugify(f.title);
    setBusy(status === "published" ? "publish" : "save");
    setError(null);
    try {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, slug, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      router.push("/app/blog");
      router.refresh();
    } catch {
      setError("Save failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="screen" style={{ maxWidth: 880 }}>
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Content</div>
          <h1 className="screen-title">{initial ? "Edit post" : "New post"}</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Badge tone={f.status === "published" ? "pos" : "neutral"} dot>
            {f.status}
          </Badge>
          <Button variant="secondary" onClick={() => save("draft")} disabled={!!busy}>
            {busy === "save" ? "Saving…" : "Save draft"}
          </Button>
          <Button variant="primary" iconRight="arrowRight" onClick={() => save("published")} disabled={!!busy}>
            {busy === "publish" ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      {error ? <div className="editor-alert editor-alert--error">{error}</div> : null}
      {info ? <div className="editor-alert editor-alert--ok">{info}</div> : null}

      {/* AI draft */}
      <div className="editor-card">
        <div className="editor-card__head">
          <Icon name="barChart" size={16} color="var(--accent)" />
          <span>Draft with AI</span>
        </div>
        <p className="editor-card__hint">
          Give a topic and (optionally) notes. Claude drafts an SEO/AEO-optimised article with internal links and FAQ —
          you review and edit before publishing.
        </p>
        <Input label="Topic" placeholder="e.g. What UK construction formation trends tell founders in 2026" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <Input label="Notes (optional)" placeholder="angle, audience, links to emphasise…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button variant="secondary" iconLeft="barChart" onClick={generate} disabled={!!busy}>
          {busy === "gen" ? "Drafting…" : "Generate draft"}
        </Button>
      </div>

      {/* Fields */}
      <div className="editor-fields">
        <Input label="Title" value={f.title} onChange={(e) => set("title", e.target.value)} />
        <Input label="Slug" placeholder="auto from title if blank" value={f.slug} onChange={(e) => set("slug", e.target.value)} hint={`/blog/${f.slug || slugify(f.title) || "…"}`} />
        <Input label="Excerpt" value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} />
        <Input label="Meta description (SEO, ≤155 chars)" value={f.meta_description} onChange={(e) => set("meta_description", e.target.value)} hint={`${f.meta_description.length}/155`} />
        <Input label="Cover image URL (optional)" value={f.cover_image} onChange={(e) => set("cover_image", e.target.value)} />

        <label className="editor-label">Body (Markdown)</label>
        <textarea className="editor-textarea" rows={20} value={f.body_md} onChange={(e) => set("body_md", e.target.value)} placeholder="## Heading&#10;&#10;Write in Markdown. Link to /industry/…, /market/…, /city/…, /signals/…" />

        {/* FAQ */}
        <div className="editor-sub">
          <div className="editor-sub__head">
            <span>FAQ (AEO + FAQ schema)</span>
            <button className="editor-add" onClick={() => set("faq", [...f.faq, { q: "", a: "" }])}>
              <Icon name="plus" size={14} /> Add
            </button>
          </div>
          {f.faq.map((item, i) => (
            <div className="editor-row" key={i}>
              <input className="editor-input" placeholder="Question" value={item.q} onChange={(e) => set("faq", f.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
              <input className="editor-input" placeholder="Answer" value={item.a} onChange={(e) => set("faq", f.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              <button className="editor-del" onClick={() => set("faq", f.faq.filter((_, j) => j !== i))} aria-label="Remove">
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Related */}
        <div className="editor-sub">
          <div className="editor-sub__head">
            <span>Related links</span>
            <button className="editor-add" onClick={() => set("related", [...f.related, { label: "", href: "" }])}>
              <Icon name="plus" size={14} /> Add
            </button>
          </div>
          {f.related.map((item, i) => (
            <div className="editor-row" key={i}>
              <input className="editor-input" placeholder="Label" value={item.label} onChange={(e) => set("related", f.related.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input className="editor-input" placeholder="/industry/technology" value={item.href} onChange={(e) => set("related", f.related.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
              <button className="editor-del" onClick={() => set("related", f.related.filter((_, j) => j !== i))} aria-label="Remove">
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
