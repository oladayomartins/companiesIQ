// ============================================================
// Research pipeline — the runner
// ------------------------------------------------------------
// collect → validate → render → validate → publish or hold.
//
// The gate is the point of this module. Publication is automatic
// only when every blocking check passes; otherwise the edition is
// written as a draft with the failures recorded, so the article
// exists for a human to inspect but nothing wrong is served.
// ============================================================
import "server-only";
import type { Study, Period } from "./types";
import { yearEarlier } from "./periods";
import { blocking, checkDataset, checkDraft, type Issue } from "./validate";
import { logRun, saveDataset, upsertResearchPost } from "./store";

export const RESEARCH_AUTHOR = "CompaniesIQ Research";

export interface RunResult {
  study: string;
  period: string;
  slug: string;
  status: "published" | "drafted" | "failed";
  issues: Issue[];
  apiCalls: number;
  durationMs: number;
  error?: string;
}

export async function runStudy(study: Study, period: Period, opts: { dryRun?: boolean; forceDraft?: boolean } = {}): Promise<RunResult> {
  const started = Date.now();
  const slug = study.slugFor(period);
  const base = { study: study.id, period: period.id, slug };
  try {
    const dataset = await study.collect(period, yearEarlier(period));
    const issues = checkDataset(dataset);
    const draft = study.render(dataset);
    issues.push(...checkDraft(draft, dataset));

    const blockers = blocking(issues);
    const status: RunResult["status"] = blockers.length || opts.forceDraft ? "drafted" : "published";
    const apiCalls = dataset.queries.length;
    const durationMs = Date.now() - started;

    if (!opts.dryRun) {
      await saveDataset(dataset);
      await upsertResearchPost(draft, { status: status === "published" ? "published" : "draft", author: RESEARCH_AUTHOR });
      await logRun({ ...base, period_id: period.id, status, issues, api_calls: apiCalls, duration_ms: durationMs });
    }
    return { ...base, period: period.id, status, issues, apiCalls, durationMs };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    const durationMs = Date.now() - started;
    if (!opts.dryRun) {
      await logRun({ ...base, period_id: period.id, status: "failed", issues: [], api_calls: 0, duration_ms: durationMs, error }).catch(() => {});
    }
    return { ...base, period: period.id, status: "failed", issues: [], apiCalls: 0, durationMs, error };
  }
}

/**
 * What the scheduler should do right now: the newest settled edition of every
 * study is (re)run, so a period publishes as soon as it settles and later
 * register revisions are picked up. Older editions are left alone — they are
 * a record of what the register said at the time.
 */
export function dueRuns(studies: Study[], now = new Date()): { study: Study; period: Period }[] {
  return studies.flatMap((s) => {
    const [newest] = s.periods(now);
    return newest ? [{ study: s, period: newest }] : [];
  });
}
