import { Suspense } from "react";
import { SearchScreen } from "@/components/app/SearchScreen";

export const metadata = { title: "Companies · CompaniesIQ" };

export default function CompaniesPage() {
  return (
    <Suspense fallback={<div className="screen"><div className="app-loading">Loading…</div></div>}>
      <SearchScreen />
    </Suspense>
  );
}
