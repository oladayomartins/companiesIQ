"use client";
// The lens selector — "Viewing as". Picking what you sell re-weights the score,
// the signal ledger, the brief, one intelligence card, the use-case tab and the
// recommended actions. Session choice lives in localStorage so anonymous and
// free visitors get the full mechanic; saving it as a default is Pro.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Icon, Badge } from "@/components/ds";
import { PROFILES, PROFILE_BY_KEY, LENSES, DEFAULT_PROFILE, type Profile } from "@/lib/lens";
import { toast } from "@/lib/toast";

const LS_PROFILE = "ciq.profile";
const LS_OTHER = "ciq.profile.other";

export function useLensProfile(savedDefault: string | null) {
  const [profileKey, setProfileKey] = useState<string>(savedDefault ?? DEFAULT_PROFILE);
  const [otherText, setOtherText] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Read the session choice after mount — server-rendered HTML must stay the
  // same for every visitor so the page can be cached and crawled.
  useEffect(() => {
    try {
      const v = localStorage.getItem(LS_PROFILE);
      const o = localStorage.getItem(LS_OTHER);
      if (v && PROFILE_BY_KEY[v]) setProfileKey(v);
      if (o) setOtherText(o);
    } catch {
      /* private mode — session choice just doesn't persist */
    }
    setHydrated(true);
  }, []);

  const choose = (key: string, other?: string) => {
    setProfileKey(key);
    if (other != null) setOtherText(other);
    try {
      localStorage.setItem(LS_PROFILE, key);
      if (other != null) localStorage.setItem(LS_OTHER, other);
    } catch {
      /* ignore */
    }
  };

  return { profileKey, otherText, choose, hydrated };
}

export function LensBar({
  profileKey,
  otherText,
  onChoose,
  savedDefault,
  canSave,
  signedIn,
}: {
  profileKey: string;
  otherText: string;
  onChoose: (key: string, other?: string) => void;
  savedDefault: string | null;
  canSave: boolean;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draftOther, setDraftOther] = useState(otherText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(savedDefault);
  const popRef = useRef<HTMLDivElement>(null);

  const profile = PROFILE_BY_KEY[profileKey] ?? PROFILE_BY_KEY[DEFAULT_PROFILE];
  const lens = LENSES[profile.lens];
  const isDefault = saved === profileKey;

  // The query is cleared whenever the picker opens or closes, so reopening
  // never shows a stale filter.
  useEffect(() => {
    setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? PROFILES.filter((p) => p.label.toLowerCase().includes(q) || LENSES[p.lens].label.toLowerCase().includes(q))
      : PROFILES;
    const by = new Map<string, Profile[]>();
    for (const p of matched) by.set(p.group, [...(by.get(p.group) ?? []), p]);
    return [...by.entries()];
  }, [query]);

  async function saveDefault() {
    setSaving(true);
    try {
      const res = await fetch("/api/lens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile: profileKey, other: profileKey === "other" ? draftOther : null }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaved(profileKey);
      toast("Saved as your default lens", { tone: "info" });
      setOpen(false);
    } catch {
      toast("Couldn't save your default — the session choice still applies", { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lensbar">
      <div className="lensbar__intro">
        <div className="lensbar__eyebrow mono">Viewing as</div>
        <div className="lensbar__hint">Scoring, signals and actions re-weight</div>
      </div>

      <div className="lensbar__current">
        <span className="lensbar__ring" aria-hidden="true">
          <Icon name="grid" size={15} />
        </span>
        <span className="lensbar__profile">{profile.label}</span>
        <span className="lensbar__model mono">{lens.label} model</span>
        {isDefault ? (
          <Badge tone="pos">Your default</Badge>
        ) : (
          <Badge tone="neutral">{signedIn ? "Not set yet" : "This session"}</Badge>
        )}
      </div>

      <div className="lensbar__action" ref={popRef}>
        <Button variant="secondary" onClick={() => setOpen((v) => !v)} iconRight="chevronDown">
          Change lens
        </Button>

        {open ? (
          <div className="lenspick" role="dialog" aria-label="Choose your lens">
            <div className="lenspick__head">
              <div className="lenspick__title">What does your business sell?</div>
              <p className="lenspick__sub">We weight the same data for the decision you are making.</p>
              <input
                className="lenspick__search"
                autoFocus
                placeholder="Search use cases…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search use cases"
              />
            </div>

            <div className="lenspick__list">
              {groups.map(([group, items]) => (
                <div key={group}>
                  <div className="lenspick__group mono">{group}</div>
                  {items.map((p) => (
                    <button
                      key={p.key}
                      className={`lenspick__opt${p.key === profileKey ? " is-on" : ""}`}
                      onClick={() => {
                        onChoose(p.key, p.key === "other" ? draftOther : undefined);
                        if (p.key !== "other") setOpen(false);
                      }}
                    >
                      <span className="lenspick__radio" aria-hidden="true" />
                      <span className="lenspick__label">{p.label}</span>
                      <span className="lenspick__model mono">Model · {LENSES[p.lens].label}</span>
                      {saved === p.key ? <Badge tone="pos">Default</Badge> : null}
                    </button>
                  ))}
                </div>
              ))}
              {groups.length === 0 ? <div className="lenspick__empty">No use case matches “{query}”.</div> : null}
            </div>

            {profileKey === "other" ? (
              <div className="lenspick__other">
                <div className="lenspick__otherTitle">Tell us what you sell</div>
                <p className="lenspick__sub">
                  We will use the general opportunity model for now and build a weighting for your use case — it appears
                  here once ready.
                </p>
                <input
                  className="lenspick__search"
                  placeholder="e.g. commercial waste contracts"
                  value={draftOther}
                  onChange={(e) => setDraftOther(e.target.value)}
                  aria-label="What do you sell"
                />
              </div>
            ) : null}

            <div className="lenspick__foot">
              {canSave ? (
                <Button variant="primary" onClick={saveDefault} disabled={saving}>
                  {saving ? "Saving…" : "Save as my default"}
                </Button>
              ) : (
                <Link href={signedIn ? "/app/upgrade" : "/pricing"}>
                  <Button variant="primary" iconRight="arrowRight">
                    Go Pro to save a default
                  </Button>
                </Link>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  onChoose(profileKey, profileKey === "other" ? draftOther : undefined);
                  setOpen(false);
                }}
              >
                Use this session only
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
