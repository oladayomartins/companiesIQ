// Shared auth for cron-target endpoints (ingest, alerts/run, digest).
// Accepts either INGEST_SECRET (manual/curl) or CRON_SECRET (the bearer Vercel
// Cron automatically attaches when CRON_SECRET is set in the project env).
import "server-only";

export function cronAuth(authHeader: string | null): { ok: boolean; configured: boolean } {
  const secrets = [process.env.INGEST_SECRET, process.env.CRON_SECRET].filter(Boolean) as string[];
  if (!secrets.length) return { ok: false, configured: false };
  return { ok: secrets.some((s) => authHeader === `Bearer ${s}`), configured: true };
}
