"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Badge } from "@/components/ds";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  analyst: "Analyst",
  team: "Team",
  enterprise: "Enterprise",
};

export function SettingsScreen({ email, plan }: { email: string; plan: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "portal" | "out">(null);
  const subscribed = plan !== "free";

  async function portal() {
    setBusy("portal");
    try {
      const r = await fetch("/api/portal", { method: "POST" });
      const d = (await r.json().catch(() => ({}))) as { url?: string };
      if (d.url) {
        window.location.href = d.url;
        return;
      }
    } catch {
      /* ignore */
    }
    setBusy(null);
  }

  async function signOut() {
    setBusy("out");
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="screen" style={{ maxWidth: 680 }}>
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Account</div>
          <h1 className="screen-title">Settings</h1>
        </div>
      </div>

      <div className="settings-card">
        <div className="settings-row">
          <span className="settings-row__label">Email</span>
          <span className="settings-row__val mono">{email}</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__label">Plan</span>
          <span className="settings-row__val">
            <Badge tone={subscribed ? "accent" : "neutral"} dot>
              {PLAN_LABEL[plan] ?? plan}
            </Badge>
            {!subscribed ? <span className="settings-row__note"> · 1 full report / month</span> : null}
          </span>
        </div>
      </div>

      <div className="settings-actions">
        {subscribed ? (
          <Button variant="secondary" onClick={portal} disabled={!!busy}>
            {busy === "portal" ? "Opening…" : "Manage billing"}
          </Button>
        ) : (
          <Link href="/app/upgrade">
            <Button variant="primary" iconRight="arrowRight">
              Upgrade to Pro
            </Button>
          </Link>
        )}
        <Button variant="ghost" onClick={signOut} disabled={!!busy}>
          {busy === "out" ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </div>
  );
}
