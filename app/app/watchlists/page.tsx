import { getCurrentUser } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { ProGate } from "@/components/app/ProGate";
import { Placeholder } from "@/components/app/Placeholder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Watchlists · CompaniesIQ" };

export default async function WatchlistsPage() {
  const user = await getCurrentUser();
  if (!(await hasProAccess(user))) {
    return (
      <ProGate
        icon="bookmark"
        title="Watchlists"
        features={["Group companies into watchlists", "Daily digest of every change", "Unlimited saved searches"]}
      />
    );
  }
  return <Placeholder title="Watchlists" sub="Group companies and get a daily digest of every change across the set. Coming soon to your plan." icon="bookmark" />;
}
