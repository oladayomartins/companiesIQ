import { getCurrentUser, getSupabaseAdmin } from "@/lib/supabase/server";
import { getBillingSummary } from "@/lib/billing";
import { SettingsScreen } from "@/components/app/SettingsScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · CompaniesIQ" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  let fullName = "";
  const admin = getSupabaseAdmin();
  if (admin && user) {
    try {
      const { data } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      fullName = data?.full_name ?? "";
    } catch {
      /* ignore */
    }
  }
  const billing = await getBillingSummary(user);
  return <SettingsScreen email={user?.email ?? "—"} fullName={fullName} billing={billing} />;
}
