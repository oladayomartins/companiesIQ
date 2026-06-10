"use client";
import { useState } from "react";
import { Button } from "@/components/ds";
import { toast } from "@/lib/toast";

// "Watch" toggle on the company report — persists to the user's watchlist and
// confirms with a toast. Optimistic flip with rollback on failure.
export function WatchButton({ companyNumber, initialWatched = false }: { companyNumber: string; initialWatched?: boolean }) {
  const [watched, setWatched] = useState(initialWatched);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !watched;
    setBusy(true);
    setWatched(next); // optimistic
    try {
      const r = next
        ? await fetch("/api/watch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyNumber }) })
        : await fetch(`/api/watch?number=${encodeURIComponent(companyNumber)}`, { method: "DELETE" });
      if (r.ok) {
        toast(next ? "Added to your watchlist" : "Removed from watchlist", { tone: next ? "success" : "info" });
      } else {
        setWatched(!next); // rollback
        toast("Couldn't update your watchlist — try again.", { tone: "error" });
      }
    } catch {
      setWatched(!next);
      toast("Couldn't update your watchlist — try again.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={watched ? "primary" : "secondary"} iconLeft="bookmark" onClick={toggle} disabled={busy}>
      {watched ? "Watching" : "Watch"}
    </Button>
  );
}
