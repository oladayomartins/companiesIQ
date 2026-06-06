import { Suspense } from "react";
import { SearchScreen } from "@/components/app/SearchScreen";

export const metadata = { title: "Search · CompaniesIQ" };

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="screen"><div className="app-loading">Loading search…</div></div>}>
      <SearchScreen />
    </Suspense>
  );
}
