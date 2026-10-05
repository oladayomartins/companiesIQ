// ============================================================
// Unattended research runs
// ------------------------------------------------------------
// Vercel Cron hits this weekly. Most weeks there is nothing to do:
// a study only has work when its newest settled period is missing
// or stale, so the job is cheap and idempotent. When a period does
// settle, the edition is collected, validated and — only if every
// blocking check passes — published. Anything that fails a check is
// written as a draft and left for a human, with the reasons in the
// response and in research_runs.
// ============================================================
import { NextResponse } from "next/server";
import { cronAuth } from "@/lib/cron-auth";
import { STUDIES, studyById } from "@/lib/research/studies";
import { dueRuns, runStudy } from "@/lib/research/publish";
import { lastRun } from "@/lib/research/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Re-run the newest edition at most this often (register revisions are slow). */
const REFRESH_AFTER_DAYS = 7;

export async function GET(req: Request) {
  // A local dev server runs the pipeline unauthenticated so an operator can
  // dry-run a study; every deployed environment requires the cron secret.
  if (process.env.NODE_ENV === "production") {
    const auth = cronAuth(req.headers.get("authorization"));
    if (!auth.configured) return NextResponse.json({ error: "No INGEST_SECRET/CRON_SECRET configured" }, { status: 503 });
    if (!auth.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const only = url.searchParams.get("study");
  const force = url.searchParams.get("force") === "1";
  const dryRun = url.searchParams.get("dry") === "1";

  const studies = only ? [studyById(only)].filter(Boolean) : STUDIES;
  if (!studies.length) return NextResponse.json({ error: `Unknown study: ${only}` }, { status: 400 });

  // One study per invocation by default. A study is ~250 register queries and
  // the rate limit is per API key, so running several back to back would spend
  // the whole five-minute budget and start failing. The weekly schedule has
  // ample room to work through them one at a time; ?all=1 overrides.
  const all = url.searchParams.get("all") === "1";

  const results: Record<string, unknown>[] = [];
  const pending: { study: (typeof STUDIES)[number]; period: ReturnType<(typeof STUDIES)[number]["periods"]>[number] }[] = [];

  for (const { study, period } of dueRuns(studies as typeof STUDIES)) {
    const slug = study.slugFor(period);
    if (!force) {
      const prev = await lastRun(slug);
      const fresh = prev && Date.now() - new Date(prev.created_at).getTime() < REFRESH_AFTER_DAYS * 86_400_000;
      if (fresh && prev.status === "published") {
        results.push({ study: study.id, period: period.id, slug, status: "skipped", reason: "ran within the refresh window" });
        continue;
      }
    }
    pending.push({ study, period });
  }

  const toRun = all ? pending : pending.slice(0, 1);
  for (const { study, period } of toRun) results.push({ ...(await runStudy(study, period, { dryRun })) });
  for (const { study, period } of pending.slice(toRun.length)) {
    results.push({ study: study.id, period: period.id, slug: study.slugFor(period), status: "deferred", reason: "one study per run; next invocation picks it up" });
  }

  const held = results.filter((r) => r.status === "drafted" || r.status === "failed");
  return NextResponse.json({ ok: held.length === 0, ran: results.length, held: held.length, results });
}
