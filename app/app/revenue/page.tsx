// Revenue — admin-only control room for conversion: money (Stripe), the
// bot-free first-party funnel, abandoned checkouts, hot leads, the Revenue
// Autopilot (lifecycle emails) and Search Console demand. Gated to ADMIN_EMAILS.
import { getCurrentUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { loadRevenueDashboard } from "@/lib/growth/dashboard";
import { RevenueScreen } from "@/components/app/RevenueScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Revenue · CompaniesIQ" };

const WINDOWS = new Set([7, 30, 90]);

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return (
      <div className="screen">
        <h1 className="screen-title">Admin only</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          Revenue and the autopilot are restricted to administrators. Ask an admin to add your email to <code>ADMIN_EMAILS</code>.
        </p>
      </div>
    );
  }
  const days = Number((await searchParams).days);
  const data = await loadRevenueDashboard(WINDOWS.has(days) ? days : 30);
  return <RevenueScreen data={data} />;
}
