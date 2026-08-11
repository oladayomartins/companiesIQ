// Tiny GA4 event helper. gtag is loaded (production only) by
// components/Analytics.tsx; this fires recommended + custom events against it.
// No-ops when gtag isn't present (localhost, or an ad-blocker), so callers
// never need to guard. Client-only — import from client components.
type GtagParams = Record<string, unknown>;

export function track(event: string, params: GtagParams = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag !== "function") return;
  w.gtag("event", event, params);
}

// Read the GA client_id + session_id so a server-side event (the purchase fired
// from the Stripe webhook) can be attributed to the same GA user/session.
// Resolves {} quickly when gtag isn't loaded (dev, blocker) — callers proceed.
export function getGaIds(timeoutMs = 800): Promise<{ clientId?: string; sessionId?: string }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve({});
    const w = window as unknown as { gtag?: (...args: unknown[]) => void };
    const id = process.env.NEXT_PUBLIC_GA_ID || "G-34HW7P1KJD";
    if (typeof w.gtag !== "function") return resolve({});
    const out: { clientId?: string; sessionId?: string } = {};
    let pending = 2;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(out);
    };
    const t = setTimeout(finish, timeoutMs);
    const one = () => {
      if (--pending <= 0) {
        clearTimeout(t);
        finish();
      }
    };
    try {
      w.gtag("get", id, "client_id", (v: string) => ((out.clientId = v), one()));
      w.gtag("get", id, "session_id", (v: string) => ((out.sessionId = v), one()));
    } catch {
      clearTimeout(t);
      finish();
    }
  });
}
