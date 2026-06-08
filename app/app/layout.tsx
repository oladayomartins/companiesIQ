import { AppShell } from "@/components/app/AppShell";
import { getCurrentUser } from "@/lib/supabase/server";
import { isAdmin, isPartner } from "@/lib/admin";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Resolve roles server-side (env allowlists aren't readable on the client)
  // so the shell can hide role-gated nav items.
  const user = await getCurrentUser();
  return (
    <AppShell admin={isAdmin(user)} partner={isPartner(user)}>
      {children}
    </AppShell>
  );
}
