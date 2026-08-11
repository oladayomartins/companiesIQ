// ============================================================
// GA4 Measurement Protocol — server-side purchase (server-only)
// ------------------------------------------------------------
// Fires the `purchase` conversion straight from the Stripe webhook, so revenue
// is captured even when the buyer blocks client-side analytics. Dark unless
// GA4_MP_API_SECRET is set (create one in GA4 → Admin → Data Streams → your
// stream → Measurement Protocol API secrets). When enabled, the client-side
// purchase suppresses itself (NEXT_PUBLIC_GA_SERVER_PURCHASE) so it's never
// double-counted. Value/currency come from the real Stripe amount.
// ============================================================
import "server-only";

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || "G-34HW7P1KJD";

/** True when a server-side purchase can be sent (MP secret configured). */
export function isGaServerPurchaseEnabled(): boolean {
  return !!process.env.GA4_MP_API_SECRET;
}

export interface Ga4Purchase {
  clientId?: string; // GA client_id captured at checkout (attribution)
  sessionId?: string; // GA session_id (session stitching)
  transactionId: string; // dedupe key — the Stripe session/subscription id
  value: number; // real amount charged
  currency?: string; // e.g. "GBP"
  items?: { item_id: string; item_name: string }[];
}

/** Send a `purchase` event via the Measurement Protocol. Best-effort. */
export async function sendGa4Purchase(p: Ga4Purchase): Promise<boolean> {
  const secret = process.env.GA4_MP_API_SECRET;
  if (!secret || !MEASUREMENT_ID) return false;

  // GA4 requires a client_id. A real one (captured at checkout) preserves
  // acquisition attribution; otherwise fall back so revenue still counts.
  const clientId = p.clientId || `${Date.now()}.${Math.floor(Math.random() * 1e9)}`;

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(MEASUREMENT_ID)}&api_secret=${encodeURIComponent(secret)}`;
  const body = {
    client_id: clientId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: p.transactionId,
          value: p.value,
          currency: p.currency || "GBP",
          ...(p.sessionId ? { session_id: p.sessionId } : {}),
          engagement_time_msec: 1,
          items: p.items ?? [],
        },
      },
    ],
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok; // MP returns 204 on success
  } catch {
    return false;
  }
}
