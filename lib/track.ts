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
