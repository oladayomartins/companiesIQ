import { getCurrentUser } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/access";
import { SettingsScreen } from "@/components/app/SettingsScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · CompaniesIQ" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const plan = await getUserPlan(user);
  return <SettingsScreen email={user?.email ?? "—"} plan={plan} />;
}
