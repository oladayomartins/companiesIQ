// Signup-session attribution (client-only).
//
// Remembers how THIS visit started — the first page, the external referrer and
// any UTM tags — in sessionStorage, so that if the visit ends in a new account
// we can record where it came from (landing page → signup → revenue on the
// admin Revenue screen). Deliberately minimal: no identifier, no cookie, gone
// when the tab closes, and only ever sent to our own API on signup.
const KEY = "ciq_visit";

export interface Visit {
  landing: string; // first path of the visit, e.g. /blog/endole-alternative
  referrer: string | null; // external referring host, e.g. www.google.com
  utm: Record<string, string>; // utm_source / medium / campaign / term / content
  at: string;
}

export function captureVisit(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(KEY)) return; // first page of the visit wins
    const sp = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const v = sp.get(k);
      if (v) utm[k] = v.slice(0, 100);
    }
    let referrer: string | null = null;
    try {
      const host = document.referrer ? new URL(document.referrer).host : "";
      referrer = host && host !== window.location.host ? host : null;
    } catch {
      referrer = null;
    }
    const visit: Visit = { landing: window.location.pathname.slice(0, 200), referrer, utm, at: new Date().toISOString() };
    sessionStorage.setItem(KEY, JSON.stringify(visit));
  } catch {
    /* storage blocked — attribution is best-effort */
  }
}

export function readVisit(): Visit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Visit) : null;
  } catch {
    return null;
  }
}

/** Send this visit's attribution for a just-created account. Best-effort, quick. */
export async function sendSignupAttribution(): Promise<void> {
  const visit = readVisit();
  if (!visit) return;
  try {
    await Promise.race([
      fetch("/api/growth/attribution", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(visit),
        keepalive: true,
      }),
      new Promise((r) => setTimeout(r, 1500)), // never hold up the redirect
    ]);
  } catch {
    /* ignore */
  }
}
