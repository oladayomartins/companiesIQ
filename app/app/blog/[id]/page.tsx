import { getCurrentUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { getPostById } from "@/lib/posts";
import { BlogEditor } from "@/components/app/BlogEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit post · CompaniesIQ" };

export default async function BlogEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return (
      <div className="screen">
        <h1 className="screen-title">Admin only</h1>
      </div>
    );
  }
  const { id } = await params;
  const post = id === "new" ? null : await getPostById(id);
  return <BlogEditor initial={post} />;
}
