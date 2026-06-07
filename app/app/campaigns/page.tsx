// Funnel/campaign analytics + QR generator (DigitWarehouse tooling).
// Aggregates only — no lead PII is read or rendered (leads are RLS-locked and
// /app is currently unauthenticated; gate this route before production use).
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { CampaignsScreen, type CampaignStats } from "@/components/app/CampaignsScreen";

export const metadata = { title: "Campaigns · CompaniesIQ" };
export const dynamic = "force-dynamic";

async function loadStats(): Promise<CampaignStats | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  try {
    const { data: events } = await admin.from("funnel_events").select("event, source").limit(5000);
    const { count: leads } = await admin.from("leads").select("id", { count: "exact", head: true });

    const byEvent: Record<string, number> = { scan: 0, view: 0, lead: 0, purchase: 0 };
    const bySource: Record<string, { scan: number; view: number; lead: number; purchase: number }> = {};
    for (const e of events ?? []) {
      const ev = (e.event as string) || "view";
      byEvent[ev] = (byEvent[ev] ?? 0) + 1;
      const src = (e.source as string) || "direct";
      bySource[src] = bySource[src] || { scan: 0, view: 0, lead: 0, purchase: 0 };
      if (ev in bySource[src]) (bySource[src] as Record<string, number>)[ev]++;
    }
    return { totalLeads: leads ?? 0, byEvent, bySource };
  } catch {
    return null;
  }
}

export default async function CampaignsPage() {
  const stats = await loadStats();
  return <CampaignsScreen stats={stats} />;
}
