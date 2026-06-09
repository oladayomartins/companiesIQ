"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Icon } from "@/components/ds";
import type { ProspectTarget } from "@/components/app/AddToProspect";

interface ListLite {
  id: string;
  name: string;
  count: number;
}

// Bulk "Add to prospect list" — saves a whole selection in one call. Used in
// the search results bar (the accountant/agency "run a search → save leads" flow).
export function BulkAddToProspect({ companies, onDone }: { companies: ProspectTarget[]; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ListLite[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const n = companies.length;

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setError(null);
    if (lists === null) {
      try {
        const r = await fetch("/api/prospects/lists");
        const d = (await r.json().catch(() => ({}))) as { lists?: ListLite[] };
        setLists(d.lists ?? []);
      } catch {
        setLists([]);
      }
    }
  }

  async function add(opts: { listId?: string; listName?: string }) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/prospects/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listId: opts.listId, listName: opts.listName, companies }),
      });
      const d = (await r.json().catch(() => ({}))) as { added?: number };
      if (!r.ok) {
        setError("Could not add — try again.");
        return;
      }
      setAdded(d.added ?? n);
      setOpen(false);
      setNewName("");
      setLists(null);
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  if (added != null) {
    return (
      <span className="atp-done">
        <Icon name="check" size={14} color="var(--pos)" /> Added {added} ·{" "}
        <Link href="/app/prospects">View prospects →</Link>
        <button className="atp-again" onClick={() => setAdded(null)}>
          Dismiss
        </button>
      </span>
    );
  }

  return (
    <div className="atp">
      <Button variant="primary" size="sm" iconLeft="bookmark" onClick={toggle} disabled={!n}>
        Add {n} to prospect list
      </Button>
      {open ? (
        <div className="atp-pop atp-pop--right">
          <div className="atp-pop__head">Save {n} compan{n === 1 ? "y" : "ies"} to…</div>
          {lists === null ? (
            <div className="atp-pop__empty">Loading…</div>
          ) : lists.length ? (
            <div className="atp-pop__lists">
              {lists.map((l) => (
                <button key={l.id} className="atp-pop__item" disabled={busy} onClick={() => add({ listId: l.id })}>
                  <span>{l.name}</span>
                  <span className="atp-pop__count">{l.count}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="atp-pop__empty">No lists yet — create your first below.</div>
          )}
          <form
            className="atp-pop__new"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) add({ listName: newName.trim() });
            }}
          >
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New list name…" maxLength={120} />
            <Button variant="secondary" size="sm" type="submit" disabled={busy || !newName.trim()}>
              Create &amp; add
            </Button>
          </form>
          {error ? <div className="atp-pop__error">{error}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
