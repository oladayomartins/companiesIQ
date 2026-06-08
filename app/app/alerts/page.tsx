import { getCurrentUser } from "@/lib/supabase/server";
import { isSubscribed } from "@/lib/access";
import { ProGate } from "@/components/app/ProGate";
import { AlertsScreen } from "@/components/app/AlertsScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alerts · CompaniesIQ" };

export default async function AlertsPage() {
  const user = await getCurrentUser();
  if (!(await isSubscribed(user))) {
    return (
      <ProGate
        icon="bell"
        title="Alerts"
        features={["Real-time new-formation alerts", "Filing, appointment & status changes", "Email & webhook delivery"]}
      />
    );
  }
  return <AlertsScreen />;
}
