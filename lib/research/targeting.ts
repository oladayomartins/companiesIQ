// ============================================================
// Research pipeline — the targeting layer
// ------------------------------------------------------------
// Research that ends at "interesting" is marketing that doesn't
// convert. Every study therefore renders an actionable segment
// table: for each finding, who it matters to, why now, and the
// live page on this site that lists the actual companies behind
// the number. The commercial angles are editorial (written once,
// per sector, and honest about what the data does and doesn't
// support) — never invented per run, and never presented as
// something the register itself says.
// ============================================================
import { classifySic, CURATED_SIC_CODES } from "@/lib/sic";
import { slugify } from "@/lib/slug";
import type { Cell } from "./types";

/** Who typically sells into a sector, and the opening that new formations create. */
const SECTOR_ANGLES: Record<string, { buyers: string; angle: string }> = {
  Technology: {
    buyers: "accountants, R&D tax advisers, cloud resellers, recruiters",
    angle: "New tech companies pick their accountant, payroll and cloud stack in the first 90 days and rarely revisit the decision.",
  },
  "Real estate": {
    buyers: "conveyancers, brokers, insurers, property managers",
    angle: "A newly registered property vehicle usually precedes a purchase or refinance, so the buying window is short and dated.",
  },
  "Professional services": {
    buyers: "PII brokers, practice-management software, referral partners",
    angle: "New consultancies need professional indemnity cover and a compliant billing setup before they can invoice a first client.",
  },
  "Retail & wholesale": {
    buyers: "payment providers, 3PL and fulfilment, packaging suppliers",
    angle: "Online retailers commit to a payment processor and a fulfilment partner almost immediately after incorporating.",
  },
  Construction: {
    buyers: "CIS accountants, plant hire, trade insurers, merchants",
    angle: "New construction companies hit CIS, insurance and equipment decisions in their first project cycle.",
  },
  Hospitality: {
    buyers: "EPOS vendors, food wholesalers, licensing consultants, insurers",
    angle: "A new hospitality company is typically weeks from a fit-out, a licence application and a first supplier contract.",
  },
  "Healthcare & social": {
    buyers: "CQC compliance consultants, medical indemnity, staffing agencies",
    angle: "Care and clinical companies must clear registration and indemnity requirements before they can trade.",
  },
  "Business support": {
    buyers: "software vendors, outsourced finance, virtual office providers",
    angle: "Support-services companies are lean at formation and buy tooling rather than hiring.",
  },
  "Transport & logistics": {
    buyers: "fleet insurers, telematics, fuel cards, operator-licence advisers",
    angle: "Vehicle-based companies need insurance, licensing and fuel arrangements before the first job.",
  },
  "Financial services": {
    buyers: "compliance consultants, AML tooling, audit firms",
    angle: "Financial vehicles carry regulatory and reporting obligations from day one.",
  },
  Education: {
    buyers: "safeguarding and DBS providers, LMS vendors, insurers",
    angle: "Education companies need safeguarding, insurance and delivery tooling before enrolling anyone.",
  },
  "Arts & recreation": {
    buyers: "event insurers, booking platforms, venue suppliers",
    angle: "Creative and recreation companies form around a specific project with a fixed start date.",
  },
  Manufacturing: {
    buyers: "equipment finance, industrial insurers, materials suppliers",
    angle: "Manufacturers face capital-equipment and supply decisions early and buy on finance.",
  },
  "Other services": {
    buyers: "booking software, insurers, local marketing services",
    angle: "Personal-services companies are owner-operated and buy simple, low-friction tools.",
  },
};

const DEFAULT_ANGLE = {
  buyers: "accountants, insurers and sector-specific suppliers",
  angle: "Newly incorporated companies make their first supplier decisions within the opening months of trading.",
};

export interface Segment {
  code: string;
  label: string;
  sector: string;
  volume: number;
  changePct: number | null;
  buyers: string;
  angle: string;
  /** A page on this site that lists the real companies behind the number. */
  href: string;
}

/** Turn measured rows into segments a reader can actually work. */
export function segmentsFor(cells: Cell[], limit = 8): Segment[] {
  return cells.slice(0, limit).map((c) => {
    const cls = classifySic(c.key);
    const a = SECTOR_ANGLES[cls.sector] ?? DEFAULT_ANGLE;
    // Only link to a SIC page we actually build; otherwise send the reader to
    // the sector landing, which always exists.
    const href = CURATED_SIC_CODES.includes(c.key) ? `/sic/${c.key}` : `/industry/${slugify(cls.sector)}`;
    return {
      code: c.key,
      label: c.label,
      sector: cls.sector,
      volume: c.value,
      changePct: c.changePct ?? null,
      buyers: a.buyers,
      angle: a.angle,
      href,
    };
  });
}
