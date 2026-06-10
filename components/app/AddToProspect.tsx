"use client";
import Link from "next/link";
import { useState } from "react";
import { Button, Icon } from "@/components/ds";
import { toast } from "@/lib/toast";

export interface ProspectTarget {
  number: string;
  name?: string | null;
  sector?: string | null;
  region?: string | null;
  score?: number | null;
}

interface ListLite {
  id: string;
  name: string;
  count: number;
}

// "Add to prospect list" — the lead-capture action on the Opportunity
// Intelligence view. Opens a small picker of the user's lists (or create one).
export function AddToProspect({ company }: { company: ProspectTarget }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ListLite[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const r = await fetch("/api/prospects/items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listId: opts.listId,
          listName: opts.listName,
          companyNumber: company.number,
          companyName: company.name,
          sector: company.sector,
          region: company.region,
          score: company.score,
        }),
      });
      if (!r.ok) {
        setError("Could not add — try again.");
        toast("Couldn't add to list — try again.", { tone: "error" });
        return;
      }
      const label = opts.listName ?? lists?.find((l) => l.id === opts.listId)?.name ?? "your list";
      setAdded(label);
      toast(`Added ${company.name ?? "company"} to ${label}`);
      setOpen(false);
      setNewName("");
      // Refresh counts on next open.
      setLists(null);
    } finally {
      setBusy(false);
    }
  }

  if (added) {
    return (
      <span className="atp-done">
        <Icon name="check" size={14} color="var(--pos)" /> Added to <strong>{added}</strong> ·{" "}
        <Link href="/app/prospects">View prospects →</Link>
        <button className="atp-again" onClick={() => setAdded(null)}>
          Add to another
        </button>
      </span>
    );
  }

  return (
    <div className="atp">
      <Button variant="primary" size="sm" iconLeft="bookmark" onClick={toggle}>
        Add to prospect list
      </Button>
      {open ? (
        <div className="atp-pop">
          <div className="atp-pop__head">Save {company.name ?? "this company"} to…</div>
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
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New list name…"
              maxLength={120}
            />
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
