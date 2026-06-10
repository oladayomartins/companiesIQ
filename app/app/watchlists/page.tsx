import { getCurrentUser } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { getWatchedCompanies } from "@/lib/watchlist";
import { ProGate } from "@/components/app/ProGate";
import { WatchlistsScreen } from "@/components/app/WatchlistsScreen";

export const dynamic = "force-dynamic";
export const metadata = { title: "Watchlists · CompaniesIQ" };

export default async function WatchlistsPage() {
  const user = await getCurrentUser();
  if (!(await hasProAccess(user))) {
    return (
      <ProGate
        icon="bookmark"
        title="Watchlists"
        features={["Track companies you care about", "Jump back into any report", "One place for every saved company"]}
      />
    );
  }
  const companies = await getWatchedCompanies();
  return <WatchlistsScreen companies={companies} />;
}
