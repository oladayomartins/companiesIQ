import { getCurrentUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { listAllPosts } from "@/lib/posts";
import { BlogAdmin } from "@/components/app/BlogAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog admin · CompaniesIQ" };

export default async function BlogAdminPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) {
    return (
      <div className="screen">
        <h1 className="screen-title">Admin only</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          The blog editor is restricted to administrators. Ask an admin to add your email to <code>ADMIN_EMAILS</code>.
        </p>
      </div>
    );
  }
  const posts = await listAllPosts();
  return <BlogAdmin posts={posts} />;
}
