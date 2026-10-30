// Shared auth for cron-target endpoints (ingest, alerts/run, digest).
// Accepts either INGEST_SECRET (manual/curl) or CRON_SECRET (the bearer Vercel
// Cron automatically attaches when CRON_SECRET is set in the project env).
import "server-only";
import { timingSafeEqual } from "node:crypto";

// Constant-time compare so the secret can't be recovered by timing the 401s.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function cronAuth(authHeader: string | null): { ok: boolean; configured: boolean } {
  const secrets = [process.env.INGEST_SECRET, process.env.CRON_SECRET].filter(Boolean) as string[];
  if (!secrets.length) return { ok: false, configured: false };
  if (!authHeader) return { ok: false, configured: true };
  return { ok: secrets.some((s) => safeEqual(authHeader, `Bearer ${s}`)), configured: true };
}
