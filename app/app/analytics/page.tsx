import { redirect } from "next/navigation";

// Markets moved to /app/markets. Keep this path alive for old links/bookmarks.
export default function AnalyticsPage() {
  redirect("/app/markets");
}
