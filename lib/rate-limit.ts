// Best-effort per-IP rate limit for public endpoints that cost money or write
// data (Claude parsing, lead capture, opt-ins, checkout creation).
//
// In-memory and per server instance: on serverless each warm instance counts
// separately, so this blunts bursts and naive scripts rather than a
// distributed attack. For a hard guarantee put Upstash/Vercel WAF rate limits
// in front; this keeps the same call shape so it can be swapped in one place.
import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip")) || "unknown";
}

/** Returns a 429 response when the caller is over `limit` hits per `windowMs`, else null. */
export function rateLimit(req: Request, name: string, limit: number, windowMs = 60_000): NextResponse | null {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }
  const key = `${name}:${clientIp(req)}`;
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  b.count += 1;
  if (b.count <= limit) return null;
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(Math.ceil((b.resetAt - now) / 1000)) } }
  );
}
