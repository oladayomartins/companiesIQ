// Admin gate for the blog CMS. An admin is any signed-in user whose email is
// in the ADMIN_EMAILS allowlist (comma-separated env var). Server-only — never
// expose the allowlist to the client.
import "server-only";
import type { User } from "@supabase/supabase-js";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export function isAdmin(user: User | null): boolean {
  return isAdminEmail(user?.email);
}
