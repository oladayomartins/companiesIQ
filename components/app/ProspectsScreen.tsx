"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, Button, Badge, Icon, StatusPill } from "@/components/ds";
import { fmtDate } from "@/lib/format";
import { toast } from "@/lib/toast";
import type { ProspectList, ProspectItem } from "@/lib/prospects";

export function ProspectsScreen({
  lists,
  selected,
}: {
  lists: ProspectList[];
  selected: { list: ProspectList; items: ProspectItem[] } | null;
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/prospects/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const d = (await r.json().catch(() => ({}))) as { list?: { id: string } };
      const name = newName.trim();
      setNewName("");
      if (d.list?.id) router.push(`/app/prospects?list=${d.list.id}`);
      router.refresh();
      toast(`Created list “${name}”`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(companyNumber: string) {
    if (!selected) return;
    setBusy(true);
    try {
      await fetch(`/api/prospects/items?listId=${selected.list.id}&number=${companyNumber}`, { method: "DELETE" });
      router.refresh();
      toast("Removed from list", { tone: "info" });
    } finally {
      setBusy(false);
    }
  }

  async function deleteList() {
    if (!selected) return;
    if (!confirm(`Delete the list "${selected.list.name}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/prospects/lists/${selected.list.id}`, { method: "DELETE" }).catch(() => {});
      router.push("/app/prospects");
      router.refresh();
      toast("List deleted", { tone: "info" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <div className="app-eyebrow">Lead lists</div>
          <h1 className="screen-title">Prospects</h1>
        </div>
      </div>

      <div className="prospects">
        {/* Sidebar — lists */}
        <aside className="prospects__side">
          <div className="prospects__side-title">Your lists</div>
          <div className="prospects__lists">
            {lists.length ? (
              lists.map((l) => (
                <Link
                  key={l.id}
                  href={`/app/prospects?list=${l.id}`}
                  className={"prospects__list" + (selected?.list.id === l.id ? " is-active" : "")}
                >
                  <span className="prospects__list-name">{l.name}</span>
                  <span className="prospects__list-count">{l.count}</span>
                </Link>
              ))
            ) : (
              <p className="rsec__note">No lists yet. Create one, or use “Add to prospect list” on any company report.</p>
            )}
          </div>
          <form className="prospects__new" onSubmit={createList}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New list name…" maxLength={120} />
            <Button variant="secondary" size="sm" type="submit" disabled={busy || !newName.trim()} iconLeft="plus">
              Create
            </Button>
          </form>
        </aside>

        {/* Main — selected list */}
        <section className="prospects__main">
          {selected ? (
            <Card>
              <CardBody>
                <div className="prospects__head">
                  <div>
                    <h2 className="prospects__name">{selected.list.name}</h2>
                    <span className="rsec__note">
                      {selected.items.length} compan{selected.items.length === 1 ? "y" : "ies"}
                    </span>
                  </div>
                  <div className="prospects__actions">
                    <a
                      className="ciq-btn ciq-btn--secondary ciq-btn--sm"
                      href={`/api/prospects/export?listId=${selected.list.id}`}
                      onClick={() => toast(`Exporting ${selected.items.length} compan${selected.items.length === 1 ? "y" : "ies"} to CSV`, { tone: "info" })}
                    >
                      <Icon name="download" size={15} />
                      <span>Export CSV</span>
                    </a>
                    <Button variant="ghost" size="sm" onClick={deleteList} disabled={busy}>
                      Delete list
                    </Button>
                  </div>
                </div>

                {selected.items.length ? (
                  <div className="prospect-rows">
                    <div className="prospect-row prospect-row--head">
                      <span>Company</span>
                      <span>Sector</span>
                      <span>Region</span>
                      <span>Score</span>
                      <span>Added</span>
                      <span />
                    </div>
                    {selected.items.map((it) => (
                      <div className="prospect-row" key={it.companyNumber}>
                        <Link href={`/company/${it.companyNumber}`} className="prospect-row__name">
                          {it.companyName ?? it.companyNumber}
                          <span className="prospect-row__no mono">{it.companyNumber}</span>
                        </Link>
                        <span>{it.sector ?? "—"}</span>
                        <span>{it.region ?? "—"}</span>
                        <span>{it.score != null ? <Badge tone="accent">{it.score}</Badge> : "—"}</span>
                        <span className="mono">{it.addedAt ? fmtDate(it.addedAt) : "—"}</span>
                        <button className="prospect-row__rm" onClick={() => remove(it.companyNumber)} disabled={busy} aria-label="Remove">
                          <Icon name="x" size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="prospects__empty">
                    <StatusPill status="active" />
                    <p>This list is empty. Open any company report and use “Add to prospect list”.</p>
                    <Link href="/app/companies">
                      <Button variant="primary" size="sm" iconRight="arrowRight">
                        Find companies
                      </Button>
                    </Link>
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <div className="prospects__empty">
                  <Icon name="bookmark" size={28} />
                  <p>Create a list to start qualifying and grouping leads, then export to CSV.</p>
                </div>
              </CardBody>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
