// Role gates (server-only — never expose the allowlists to the client).
//   ADMIN_EMAILS   → blog CMS (/app/blog) access.
//   PARTNER_EMAILS → DigitWarehouse-exclusive features (Campaigns, QR
//                    generation, the funnel "Founder view").
// Both are comma-separated env vars. A user is matched by email.
import "server-only";
import type { User } from "@supabase/supabase-js";

function allowlist(envValue: string | undefined): string[] {
  return (envValue || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function adminEmails(): string[] {
  return allowlist(process.env.ADMIN_EMAILS);
}

export function partnerEmails(): string[] {
  return allowlist(process.env.PARTNER_EMAILS);
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export function isPartnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return partnerEmails().includes(email.toLowerCase());
}

export function isAdmin(user: User | null): boolean {
  return isAdminEmail(user?.email);
}

/** DigitWarehouse partner — gates the exclusive funnel/campaign tooling. */
export function isPartner(user: User | null): boolean {
  return isPartnerEmail(user?.email);
}
