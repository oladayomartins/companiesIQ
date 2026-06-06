import { redirect } from "next/navigation";

// Insights has been merged into Markets. Keep the route alive so any old
// links/bookmarks land on the regional + industry intelligence screen.
export default function InsightsPage() {
  redirect("/app/markets");
}
