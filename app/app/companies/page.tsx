import { Suspense } from "react";
import { SearchScreen } from "@/components/app/SearchScreen";
import { getCurrentUser } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/access";
import { ProGate } from "@/components/app/ProGate";

export const metadata = { title: "Companies · CompaniesIQ" };
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  if (!(await hasProAccess(await getCurrentUser()))) {
    return (
      <ProGate
        icon="search"
        title="Company search"
        features={["Search & filter all 5.5M companies", "Natural-language queries", "Export results to CSV"]}
      />
    );
  }
  return (
    <Suspense fallback={<div className="screen"><div className="app-loading">Loading…</div></div>}>
      <SearchScreen />
    </Suspense>
  );
}
