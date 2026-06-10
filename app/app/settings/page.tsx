import { getCurrentUser, getSupabaseServer } from "@/lib/supabase/server";
import { getBillingSummary } from "@/lib/billing";
import { isAdmin, isPartner } from "@/lib/admin";
import { SettingsScreen } from "@/components/app/SettingsScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · CompaniesIQ" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  let fullName = "";
  // RLS-scoped read (own row only) — no service-role needed for own profile.
  const sb = await getSupabaseServer();
  if (sb && user) {
    try {
      const { data } = await sb.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      fullName = data?.full_name ?? "";
    } catch {
      /* ignore */
    }
  }
  const billing = await getBillingSummary(user);
  const comped = isAdmin(user) || isPartner(user);
  return <SettingsScreen email={user?.email ?? "—"} fullName={fullName} billing={billing} comped={comped} />;
}
