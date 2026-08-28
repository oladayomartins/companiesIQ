"use client";
// The user's own account activity.
//
// An audit log nobody can read does not answer a subject-access request — it
// just moves the problem into the database. Showing it here means "what have
// you recorded about me" has a self-serve answer.
import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody, Badge } from "@/components/ds";
import { fmtDate } from "@/lib/format";

interface Row {
  id: number;
  action: string;
  subject: string | null;
  created_at: string;
}

// Plain English, because "api.key.revoke" is a log line, not a sentence.
const LABELS: Record<string, string> = {
  "api.key.create": "Created an API key",
  "api.key.revoke": "Revoked an API key",
  "export.csv": "Exported a CSV",
  "contact.reveal": "Revealed a director contact",
  "search.save": "Saved a search",
  "watch.add": "Watched a company",
};

export function ActivityCard() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setRows(d.events ?? []))
      .catch(() => setRows([]));
  }, []);

  if (rows === null) return null;

  return (
    <Card>
      <CardHeader
        subtitle="Account"
        title="Recent activity"
        action={rows.length ? <Badge tone="neutral">{rows.length}</Badge> : null}
      />
      <CardBody>
        {rows.length === 0 ? (
          <p className="settings__note">Nothing recorded yet. Actions like saving a search or creating an API key appear here.</p>
        ) : (
          <div className="activity">
            {rows.map((r) => (
              <div className="activity__row" key={r.id}>
                <span className="activity__what">{LABELS[r.action] ?? r.action}</span>
                {r.subject ? <span className="activity__subject mono">{r.subject}</span> : null}
                <span className="activity__when mono">{fmtDate(r.created_at)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="settings__note">
          We keep this record so we can answer questions about how your account has been used, and to honour data
          requests. It is visible only to you.
        </p>
      </CardBody>
    </Card>
  );
}
