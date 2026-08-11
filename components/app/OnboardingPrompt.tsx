"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Icon } from "@/components/ds";

// First-run nudge shown once (server decides via profiles.onboarded_at) to
// free users with no saved name. Non-blocking and skippable — captures a
// confirmed name + company (pre-filled with email-derived guesses) so the app
// is personalised and the free lead is qualified. Writes via /api/profile.
export function OnboardingPrompt({ suggestedName, suggestedCompany }: { suggestedName: string; suggestedCompany: string }) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [company, setCompany] = useState(suggestedCompany);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  async function post(payload: Record<string, unknown>) {
    try {
      await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    } catch {
      /* best-effort */
    }
  }

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    await post({ full_name: name, company, onboarded: true });
    setHidden(true);
    router.refresh(); // refresh so the dashboard greeting updates immediately
  }

  async function skip() {
    setHidden(true);
    await post({ onboarded: true }); // mark done so it doesn't reappear
  }

  return (
    <div className="onboard" role="dialog" aria-label="Set up your profile">
      <button type="button" className="onboard__close" aria-label="Skip" onClick={skip}>
        <Icon name="x" size={16} />
      </button>
      <div className="onboard__title">Welcome to CompaniesIQ 👋</div>
      <p className="onboard__sub">What should we call you? It personalises your dashboard and alerts — takes five seconds.</p>
      <div className="onboard__fields">
        <Input label="Your name" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Company (optional)" placeholder="Acme Ltd" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <div className="onboard__actions">
        <Button variant="primary" onClick={save} disabled={busy || !name.trim()} iconRight="arrowRight">
          {busy ? "Saving…" : "Save"}
        </Button>
        <button type="button" className="onboard__skip" onClick={skip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
