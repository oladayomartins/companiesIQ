"use client";
// API key management. Lives in Settings because that is where the docs send
// people — an API nobody can get a key for is not shipped.
//
// The plaintext key is shown exactly once, on creation, because the server
// keeps only a hash. The UI has to make that consequence obvious BEFORE the
// dialog is dismissed, or the first thing a customer does with the feature is
// lose their credential.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardBody, Button, Badge, Icon } from "@/components/ds";
import { toast } from "@/lib/toast";
import { fmtDate } from "@/lib/format";

interface KeyRow {
  id: string;
  name: string | null;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export function ApiKeysCard() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [quota, setQuota] = useState(0);
  const [entitled, setEntitled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      const d = await res.json();
      setKeys(d.keys ?? []);
      setQuota(d.quota ?? 0);
      setEntitled(!!d.entitled);
    } catch {
      /* leave the empty state in place */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast(d.error ?? "Could not create key", { tone: "error" });
        return;
      }
      setFresh(d.key);
      setName("");
      void load();
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    setKeys((k) => k.filter((x) => x.id !== id));
    const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Could not revoke that key", { tone: "error" });
      void load();
    }
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader
        subtitle="Developers"
        title="API keys"
        action={entitled ? <Badge tone="neutral">{quota.toLocaleString("en-GB")} calls/mo</Badge> : null}
      />
      <CardBody>
        {!entitled ? (
          <>
            <p className="settings__note">
              The API is included on the Team and Enterprise plans. Search companies, pull a company record, and filter
              by sector or region.
            </p>
            <div className="apikeys__actions">
              <Button href="/app/upgrade" variant="primary" iconRight="arrowRight">
                See plans
              </Button>
              <Button href="/api-docs" variant="secondary">
                Read the docs
              </Button>
            </div>
          </>
        ) : (
          <>
            {fresh ? (
              <div className="apikeys__fresh">
                <div className="apikeys__freshHead">
                  <Icon name="shield" size={16} />
                  <strong>Copy this key now — it will not be shown again.</strong>
                </div>
                <code className="apikeys__secret">{fresh}</code>
                <div className="apikeys__actions">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void navigator.clipboard.writeText(fresh);
                      toast("Key copied", { tone: "info" });
                    }}
                  >
                    Copy
                  </Button>
                  <Button variant="ghost" onClick={() => setFresh(null)}>
                    I&apos;ve saved it
                  </Button>
                </div>
              </div>
            ) : null}

            {keys.length ? (
              <div className="apikeys__list">
                {keys.map((k) => (
                  <div className="apikeys__row" key={k.id}>
                    <div>
                      <div className="apikeys__name">{k.name || "Untitled key"}</div>
                      <div className="apikeys__meta mono">
                        {k.key_prefix}… · created {fmtDate(k.created_at)} ·{" "}
                        {k.last_used_at ? `last used ${fmtDate(k.last_used_at)}` : "never used"}
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => revoke(k.id)}>
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="settings__note">No keys yet. Create one to start calling the API.</p>
            )}

            <div className="apikeys__create">
              <input
                className="apikeys__input"
                placeholder="Key name (e.g. Zapier)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Key name"
              />
              <Button variant="primary" onClick={create} disabled={creating}>
                {creating ? "Creating…" : "Create key"}
              </Button>
            </div>
            <p className="settings__note">
              <Link href="/api-docs">Read the API docs</Link> — endpoints, filters, rate limits and errors.
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
