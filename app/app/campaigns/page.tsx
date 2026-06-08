// Funnel/campaign analytics + QR generator — DigitWarehouse-exclusive tooling.
// Aggregates only (no lead PII; leads are RLS-locked). Gated to PARTNER_EMAILS.
import { getSupabaseAdmin, getCurrentUser } from "@/lib/supabase/server";
import { isPartner } from "@/lib/admin";
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
  const user = await getCurrentUser();
  if (!isPartner(user)) {
    return (
      <div className="screen">
        <h1 className="screen-title">Partner access only</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Campaigns, QR generation and the DigitWarehouse funnel tooling are restricted to DigitWarehouse. Ask an admin
          to add your email to <code>PARTNER_EMAILS</code>.
        </p>
      </div>
    );
  }
  const stats = await loadStats();
  return <CampaignsScreen stats={stats} />;
}
