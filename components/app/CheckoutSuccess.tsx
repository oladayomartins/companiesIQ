"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { planById, type PlanId } from "@/lib/subscription";
import { track } from "@/lib/track";

// Fires the GA4 `purchase` conversion when Stripe returns to /app?subscribed=1.
// Value + transaction_id come from the params the subscribe route appended.
// Dedupes on the session id (sessionStorage) so a refresh doesn't refire, then
// strips the params from the URL. Renders nothing.
export function CheckoutSuccess() {
  const params = useSearchParams();
  useEffect(() => {
    if (params.get("subscribed") !== "1") return;
    const session = params.get("session_id") || "";
    const key = `ciq_purchase_${session || "once"}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* private mode — proceed */
    }
    const p = planById((params.get("plan") || "") as PlanId);
    const value = params.get("interval") === "annual" ? (p.annual ?? 0) * 12 : p.monthly ?? 0;
    track("purchase", {
      transaction_id: session || undefined,
      currency: "GBP",
      value,
      items: [{ item_id: p.id, item_name: p.name }],
    });
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    const url = new URL(window.location.href);
    ["subscribed", "plan", "interval", "session_id"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [params]);
  return null;
}
