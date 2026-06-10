import { ImageResponse } from "next/og";

// Shared branded Open Graph image (1200×630) for the public SEO pages.
// Uses next/og (Satori) — note every element with multiple children needs an
// explicit display:flex.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const PAPER = "#FAF6EF";
const ACCENT = "#D9531F";
const INK = "#1C1815";
const MUTE = "#8a8178";
const SUB = "#5c544c";

export function renderOg({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "76px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: ACCENT,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 5,
              padding: 13,
            }}
          >
            <div style={{ width: 7, height: 14, background: "#fff", borderRadius: 2, display: "flex" }} />
            <div style={{ width: 7, height: 24, background: "#fff", borderRadius: 2, display: "flex" }} />
            <div style={{ width: 7, height: 19, background: "#fff", borderRadius: 2, display: "flex" }} />
          </div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 800, color: INK }}>
            <span>Companies</span>
            <span style={{ color: ACCENT }}>IQ</span>
          </div>
        </div>

        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 5, textTransform: "uppercase", color: MUTE }}>
            {eyebrow}
          </div>
          <div style={{ display: "flex", fontSize: title.length > 38 ? 60 : 74, fontWeight: 800, color: INK, lineHeight: 1.05 }}>
            {title}
          </div>
          {sub ? <div style={{ display: "flex", fontSize: 32, color: SUB }}>{sub}</div> : null}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", fontSize: 23, color: MUTE }}>
          Live UK company &amp; market intelligence · Companies House, ONS &amp; Nomis
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
