// Filing status — the accounts deadline as a number, a sentence and a line.
//
// The line runs incorporation → due date → today (or → due date, when the
// deadline is still ahead), so "1,609 days overdue" is something you can see
// rather than a figure to take on trust. Never prints a negative day count.
import Link from "next/link";
import { Card, CardBody, Badge, Icon } from "@/components/ds";
import type { Company } from "@/lib/types";
import { fmtDate } from "@/lib/format";

const DAY = 86_400_000;
const short = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

/** "4 years 5 months" — the overdue span in words, coarse on purpose. */
function span(days: number): string {
  const months = Math.floor(days / 30.44);
  if (months < 1) return `${days} day${days === 1 ? "" : "s"}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const ys = y ? `${y} year${y === 1 ? "" : "s"}` : "";
  const ms = m ? `${m} month${m === 1 ? "" : "s"}` : "";
  return [ys, ms].filter(Boolean).join(" ");
}

export function FilingStatusCard({
  company: c,
  hasFiledAccounts,
  alertHref,
  soWhat,
}: {
  company: Company;
  hasFiledAccounts: boolean;
  alertHref: string;
  /** "What this means for you" — per lens. Optional until the copy pass lands. */
  soWhat?: string | null;
}) {
  const due = c.accounts?.nextDue;
  const dueT = due ? Date.parse(due) : NaN;
  // Day granularity, so the server render and hydration agree on every
  // derived number (a millisecond clock makes the line's % differ).
  const now = Math.floor(Date.now() / DAY) * DAY;
  const days = Number.isFinite(dueT) ? Math.round((dueT - now) / DAY) : null;
  const late = !!c.accounts?.overdue || (days != null && days < 0);
  const which = hasFiledAccounts ? "Accounts" : "First accounts";

  const incT = c.incorporated ? Date.parse(c.incorporated) : NaN;
  // Positions along the line, as a % of incorporation → max(due, today).
  let line: { due: number; now: number } | null = null;
  if (Number.isFinite(incT) && Number.isFinite(dueT)) {
    const end = Math.max(dueT, now);
    const total = Math.max(end - incT, 1);
    const pct = (t: number) => Math.round(((t - incT) / total) * 1000) / 10;
    line = { due: pct(dueT), now: pct(now) };
  }

  return (
    <Card>
      <CardBody>
        <div className="icard__head">
          <span className="app-eyebrow">Filing status</span>
          <Badge tone={late ? "warn" : "neutral"}>
            {late ? "Overdue" : days != null ? "On schedule" : "No date published"}
          </Badge>
        </div>

        {days != null ? (
          <div className="fstatus__big">
            <span className={`fstatus__n${late ? " is-risk" : ""}`}>{Math.abs(days).toLocaleString("en-GB")}</span>
            <span className="fstatus__unit">{late ? "days overdue" : days === 1 ? "day to go" : "days to go"}</span>
          </div>
        ) : null}

        <p className="icard__note" style={{ marginTop: 6 }}>
          {due && late ? (
            <>
              {which} were due <strong>{fmtDate(due)}</strong> and are not on the register
              {days != null && days < 0 ? ` — about ${span(-days)} late` : ""}.
            </>
          ) : due ? (
            <>
              {which} are next due <strong>{fmtDate(due)}</strong>
              {c.accounts?.lastMadeUpTo ? `; the last set was made up to ${fmtDate(c.accounts.lastMadeUpTo)}` : ""}.
            </>
          ) : (
            "Companies House has not published an accounts deadline for this company yet."
          )}
        </p>

        {line && c.incorporated && due ? (
          <div className={`fstatus__line${late ? " is-late" : ""}`} aria-hidden="true">
            <span className="fstatus__track" />
            <span className="fstatus__fill" style={{ width: `${Math.min(line.due, line.now)}%` }} />
            {late ? <span className="fstatus__over" style={{ left: `${line.due}%`, right: 0 }} /> : null}
            <span className="fstatus__dot is-start" style={{ left: 0 }} />
            <span className="fstatus__dot is-due" style={{ left: `${line.due}%` }} />
            {late ? <span className="fstatus__dot is-now" style={{ left: "100%" }} /> : null}
            <span className="fstatus__lab mono" style={{ left: 0 }}>
              Inc · {short(c.incorporated)}
            </span>
            <span className="fstatus__lab is-mid mono" style={{ left: `clamp(40px, ${line.due}%, calc(100% - 40px))` }}>
              Due · {short(due)}
            </span>
            {late ? (
              <span className="fstatus__lab is-end mono" style={{ right: 0 }}>
                Today
              </span>
            ) : null}
          </div>
        ) : null}

        {soWhat ? (
          <p className="fstatus__sowhat">
            <strong>What this means for you:</strong> {soWhat}
          </p>
        ) : null}

        <div className="icard__foot">
          <Link className="icard__cta" href={alertHref}>
            Set a filing alert <Icon name="arrowRight" size={13} />
          </Link>
          <span className="icard__src mono">Companies House</span>
        </div>
      </CardBody>
    </Card>
  );
}
