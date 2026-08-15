// Sets cover_image on the round-3 "Know" education articles to the self-hosted
// covers committed under public/blog/covers/. PATCH-only (touches nothing else,
// so publish dates are preserved).
//
// RUN THIS ONLY AFTER the commit that adds public/blog/covers/*.jpg has been
// DEPLOYED — otherwise the cover URLs 404 in production until the deploy lands.
//
// Usage:  node scripts/set-education-covers.mjs
import { readFileSync } from "node:fs";

function env(name, fallback = null) {
  if (process.env[name]) return process.env[name];
  try {
    const file = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const line = file.split("\n").find((l) => l.startsWith(name + "="));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env.local */
  }
  return fallback;
}

const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const SITE_URL = (env("NEXT_PUBLIC_SITE_URL", "https://www.companiesiq.co.uk")).replace(/\/$/, "");
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const REST = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/posts`;
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

// slug → committed cover file (public/blog/covers/<slug>.jpg)
const SLUGS = [
  "how-companies-house-works",
  "how-to-research-a-uk-company",
  "uk-company-types-explained",
  "company-accounts-explained",
  "confirmation-statement-explained",
];

async function main() {
  for (const slug of SLUGS) {
    const cover = `${SITE_URL}/blog/covers/${slug}.jpg`;
    const res = await fetch(`${REST}?slug=eq.${slug}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ cover_image: cover, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      console.error(`  ✗ ${slug}: ${res.status} ${(await res.text()).slice(0, 200)}`);
      continue;
    }
    console.log(`  ✓ ${slug} → ${cover}`);
  }
  console.log("Done. Covers live within ~5 min (blog reads from Supabase, ~300s revalidate).");
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
