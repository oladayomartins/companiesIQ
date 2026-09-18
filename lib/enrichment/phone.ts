// ============================================================
// Phone normalisation — one canonical form per number
// ------------------------------------------------------------
// Website footers, tel: links and Google Places all spell the same
// number differently:
//
//   +44 20 1234 5678 · 020 1234 5678 · (020) 1234-5678 · 02012345678
//
// …which makes a database of them un-searchable and un-dedupable. Every
// number the pipeline captures is reduced to E.164 (+442012345678) for
// storage and comparison, with a separate human-readable form for display.
//
// Pure + client-safe (no server-only imports) so the report UI can format
// a stored number without a round-trip. See docs/contact-enrichment.md.
// ============================================================

/** Digits of a UK national significant number (the part after the trunk 0). */
const UK_NSN_MIN = 9;
const UK_NSN_MAX = 10;

/**
 * UK ranges we refuse to present as a business contact number:
 *   07 mobiles are kept (sole traders publish them), but the non-geographic
 *   premium/personal ranges below are noise or a cost trap for the caller.
 */
const UK_BLOCKED_PREFIXES = ["9", "70", "76"]; // 09xx premium, 070x personal numbering, 076x pagers

export interface NormalizedPhone {
  /** E.164, e.g. "+442012345678". Null when the input isn't a usable number. */
  e164: string | null;
  /** Human form, e.g. "+44 20 1234 5678". Null when e164 is null. */
  display: string | null;
  /** True when the number parsed as a valid UK number. */
  uk: boolean;
  /** Why it was rejected, for the evidence trail. */
  reason?: "too-short" | "too-long" | "blocked-range" | "not-a-number";
}

const FAILED: NormalizedPhone = { e164: null, display: null, uk: false, reason: "not-a-number" };

/**
 * Reduce any spelling of a phone number to E.164.
 *
 * UK-first: a bare `0…` is assumed to be UK (the register is UK-only), and
 * `00` is treated as the international prefix. A number that already carries
 * a non-UK country code is kept as-is if it is plausibly long enough, so a
 * UK-registered company publishing an Irish or US number is not discarded.
 */
export function normalizePhone(raw: string | null | undefined): NormalizedPhone {
  if (!raw) return FAILED;

  // Strip everything except digits and a single leading +.
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return FAILED;

  // 00 44 … → + 44 …
  if (!plus && digits.startsWith("00")) digits = digits.slice(2);
  else if (plus) {
    // already international
  } else if (digits.startsWith("0")) {
    digits = "44" + digits.slice(1); // trunk 0 → UK country code
  } else if (digits.startsWith("44")) {
    // e.g. "44 20 1234 5678" written without + or 0
  } else {
    // A bare national number with no trunk prefix (e.g. "20 1234 5678") is
    // ambiguous — and far more often a date, price or reference than a phone.
    return FAILED;
  }

  if (digits.startsWith("44")) {
    let nsn = digits.slice(2);
    // Some sites write "+44 (0)20 …" — the parenthesised trunk digit survives
    // the strip above and has to come back off.
    if (nsn.startsWith("0")) nsn = nsn.replace(/^0+/, "");
    if (nsn.length < UK_NSN_MIN) return { e164: null, display: null, uk: false, reason: "too-short" };
    if (nsn.length > UK_NSN_MAX) return { e164: null, display: null, uk: false, reason: "too-long" };
    if (UK_BLOCKED_PREFIXES.some((p) => nsn.startsWith(p))) {
      return { e164: null, display: null, uk: false, reason: "blocked-range" };
    }
    const e164 = `+44${nsn}`;
    return { e164, display: formatUk(nsn), uk: true };
  }

  // Non-UK international. E.164 allows 15 digits max including the country code.
  if (digits.length < 8 || digits.length > 15) {
    return { e164: null, display: null, uk: false, reason: digits.length < 8 ? "too-short" : "too-long" };
  }
  return { e164: `+${digits}`, display: `+${digits}`, uk: false };
}

/**
 * Space a UK national number the way Ofcom's number-formatting guidance does:
 * 2-digit area codes (020, 023…) split 2+4+4, 3-digit codes 3+3+4, mobiles
 * 4+6, everything else 4+6. Cosmetic only — never used for comparison.
 */
function formatUk(nsn: string): string {
  if (nsn.startsWith("7")) return `+44 ${nsn.slice(0, 4)} ${nsn.slice(4)}`;
  if (/^2[03489]/.test(nsn)) return `+44 ${nsn.slice(0, 2)} ${nsn.slice(2, 6)} ${nsn.slice(6)}`;
  if (/^1[1-9]1/.test(nsn)) return `+44 ${nsn.slice(0, 3)} ${nsn.slice(3, 6)} ${nsn.slice(6)}`;
  return `+44 ${nsn.slice(0, 4)} ${nsn.slice(4)}`;
}

/**
 * Pull every plausible phone number out of a block of text.
 *
 * Deliberately conservative: only strings that carry a trunk `0`, a `+` or an
 * international `00` are considered, because a naive "10 digits in a row"
 * match on a UK website returns company numbers, VAT numbers, prices and
 * dates far more often than it returns a phone.
 */
export function extractPhones(text: string): string[] {
  const out = new Set<string>();
  const re = /(?:\+|00)\s?44[\d\s().-]{7,18}|\b0\d[\d\s().-]{7,16}\b/g;
  for (const m of text.match(re) ?? []) {
    const n = normalizePhone(m);
    if (n.e164) out.add(n.e164);
  }
  return [...out];
}
