// Client-side funnel beacon. Sends the stage event to BOTH places:
//   • GA4 (via lib/track) — the lead-stage events GA had none of;
//   • /api/growth/event — the first-party, signed-in-only record the
//     Revenue Autopilot acts on. keepalive so it survives a navigation.
// Never throws; analytics must not break the page.
import { track } from "@/lib/track";

export type BeaconEvent =
  | "paywall_view"
  | "pricing_view"
  | "upgrade_view"
  | "plan_select"
  | "search"
  | "search_filter"
  | "search_capped"
  | "gated_action"
  | "save_search"
  | "export";

/** Small, flat context for an event — strings/numbers/booleans only. */
export type BeaconMeta = Record<string, string | number | boolean | null | undefined>;

export function growthEvent(
  event: BeaconEvent,
  params: { plan?: string; billing?: "monthly" | "annual"; ref?: string; meta?: BeaconMeta } = {},
): void {
  if (typeof window === "undefined") return;
  // GA gets the shape, never the free-text query (it can contain names).
  const { q: _q, ...gaMeta } = params.meta ?? {};
  void _q;
  track(event, { plan: params.plan, billing: params.billing, feature: params.ref, ...gaMeta });
  try {
    void fetch("/api/growth/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event, ...params, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
