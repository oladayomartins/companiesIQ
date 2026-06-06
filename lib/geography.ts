// ============================================================
// Geographic engine
// ------------------------------------------------------------
// Companies House gives a registered-office postcode. This engine
// resolves it up the standard hierarchy:
//   Postcode → (locality) → Region → Nation
// using the postcode AREA (the leading letters) mapped to the
// ONS standard regions. This enables every regional analysis.
// Source: Royal Mail postcode areas → ONS ITL1 regions.
// ============================================================
import type { GeoLocation } from "./types";

const ENGLAND = "England";
const SCOTLAND = "Scotland";
const WALES = "Wales";
const NI = "Northern Ireland";

interface AreaDef {
  region: string;
  nation: string;
}

// Postcode area (1–2 letters) → ONS region + nation.
const AREAS: Record<string, AreaDef> = {
  // London
  EC: { region: "London", nation: ENGLAND }, WC: { region: "London", nation: ENGLAND },
  E: { region: "London", nation: ENGLAND }, N: { region: "London", nation: ENGLAND },
  NW: { region: "London", nation: ENGLAND }, SE: { region: "London", nation: ENGLAND },
  SW: { region: "London", nation: ENGLAND }, W: { region: "London", nation: ENGLAND },
  // South East
  BN: { region: "South East", nation: ENGLAND }, CT: { region: "South East", nation: ENGLAND },
  GU: { region: "South East", nation: ENGLAND }, ME: { region: "South East", nation: ENGLAND },
  MK: { region: "South East", nation: ENGLAND }, OX: { region: "South East", nation: ENGLAND },
  PO: { region: "South East", nation: ENGLAND }, RG: { region: "South East", nation: ENGLAND },
  RH: { region: "South East", nation: ENGLAND }, SL: { region: "South East", nation: ENGLAND },
  SO: { region: "South East", nation: ENGLAND }, TN: { region: "South East", nation: ENGLAND },
  KT: { region: "South East", nation: ENGLAND }, DA: { region: "South East", nation: ENGLAND },
  BR: { region: "South East", nation: ENGLAND }, CR: { region: "South East", nation: ENGLAND },
  SM: { region: "South East", nation: ENGLAND }, TW: { region: "South East", nation: ENGLAND },
  UB: { region: "South East", nation: ENGLAND }, HA: { region: "South East", nation: ENGLAND },
  EN: { region: "South East", nation: ENGLAND }, IG: { region: "South East", nation: ENGLAND },
  RM: { region: "South East", nation: ENGLAND }, // greater London fringes
  // South West
  BA: { region: "South West", nation: ENGLAND }, BH: { region: "South West", nation: ENGLAND },
  BS: { region: "South West", nation: ENGLAND }, DT: { region: "South West", nation: ENGLAND },
  EX: { region: "South West", nation: ENGLAND }, GL: { region: "South West", nation: ENGLAND },
  PL: { region: "South West", nation: ENGLAND }, SN: { region: "South West", nation: ENGLAND },
  SP: { region: "South West", nation: ENGLAND }, TA: { region: "South West", nation: ENGLAND },
  TQ: { region: "South West", nation: ENGLAND }, TR: { region: "South West", nation: ENGLAND },
  // East of England
  AL: { region: "East of England", nation: ENGLAND }, CB: { region: "East of England", nation: ENGLAND },
  CM: { region: "East of England", nation: ENGLAND }, CO: { region: "East of England", nation: ENGLAND },
  IP: { region: "East of England", nation: ENGLAND }, LU: { region: "East of England", nation: ENGLAND },
  NR: { region: "East of England", nation: ENGLAND }, PE: { region: "East of England", nation: ENGLAND },
  SG: { region: "East of England", nation: ENGLAND }, SS: { region: "East of England", nation: ENGLAND },
  WD: { region: "East of England", nation: ENGLAND }, HP: { region: "East of England", nation: ENGLAND },
  // West Midlands
  B: { region: "West Midlands", nation: ENGLAND }, CV: { region: "West Midlands", nation: ENGLAND },
  DY: { region: "West Midlands", nation: ENGLAND }, HR: { region: "West Midlands", nation: ENGLAND },
  ST: { region: "West Midlands", nation: ENGLAND }, TF: { region: "West Midlands", nation: ENGLAND },
  WS: { region: "West Midlands", nation: ENGLAND }, WV: { region: "West Midlands", nation: ENGLAND },
  WR: { region: "West Midlands", nation: ENGLAND },
  // East Midlands
  DE: { region: "East Midlands", nation: ENGLAND }, LE: { region: "East Midlands", nation: ENGLAND },
  LN: { region: "East Midlands", nation: ENGLAND }, NG: { region: "East Midlands", nation: ENGLAND },
  NN: { region: "East Midlands", nation: ENGLAND },
  // Yorkshire & the Humber
  BD: { region: "Yorkshire & the Humber", nation: ENGLAND }, DN: { region: "Yorkshire & the Humber", nation: ENGLAND },
  HD: { region: "Yorkshire & the Humber", nation: ENGLAND }, HG: { region: "Yorkshire & the Humber", nation: ENGLAND },
  HU: { region: "Yorkshire & the Humber", nation: ENGLAND }, HX: { region: "Yorkshire & the Humber", nation: ENGLAND },
  LS: { region: "Yorkshire & the Humber", nation: ENGLAND }, S: { region: "Yorkshire & the Humber", nation: ENGLAND },
  WF: { region: "Yorkshire & the Humber", nation: ENGLAND }, YO: { region: "Yorkshire & the Humber", nation: ENGLAND },
  // North West
  BB: { region: "North West", nation: ENGLAND }, BL: { region: "North West", nation: ENGLAND },
  CA: { region: "North West", nation: ENGLAND }, CH: { region: "North West", nation: ENGLAND },
  CW: { region: "North West", nation: ENGLAND }, FY: { region: "North West", nation: ENGLAND },
  L: { region: "North West", nation: ENGLAND }, LA: { region: "North West", nation: ENGLAND },
  M: { region: "North West", nation: ENGLAND }, OL: { region: "North West", nation: ENGLAND },
  PR: { region: "North West", nation: ENGLAND }, SK: { region: "North West", nation: ENGLAND },
  WA: { region: "North West", nation: ENGLAND }, WN: { region: "North West", nation: ENGLAND },
  // North East
  DH: { region: "North East", nation: ENGLAND }, DL: { region: "North East", nation: ENGLAND },
  NE: { region: "North East", nation: ENGLAND }, SR: { region: "North East", nation: ENGLAND },
  TS: { region: "North East", nation: ENGLAND },
  // Scotland
  AB: { region: "Scotland", nation: SCOTLAND }, DD: { region: "Scotland", nation: SCOTLAND },
  DG: { region: "Scotland", nation: SCOTLAND }, EH: { region: "Scotland", nation: SCOTLAND },
  FK: { region: "Scotland", nation: SCOTLAND }, G: { region: "Scotland", nation: SCOTLAND },
  HS: { region: "Scotland", nation: SCOTLAND }, IV: { region: "Scotland", nation: SCOTLAND },
  KA: { region: "Scotland", nation: SCOTLAND }, KW: { region: "Scotland", nation: SCOTLAND },
  KY: { region: "Scotland", nation: SCOTLAND }, ML: { region: "Scotland", nation: SCOTLAND },
  PA: { region: "Scotland", nation: SCOTLAND }, PH: { region: "Scotland", nation: SCOTLAND },
  TD: { region: "Scotland", nation: SCOTLAND }, ZE: { region: "Scotland", nation: SCOTLAND },
  // Wales
  CF: { region: "Wales", nation: WALES }, LD: { region: "Wales", nation: WALES },
  LL: { region: "Wales", nation: WALES }, NP: { region: "Wales", nation: WALES },
  SA: { region: "Wales", nation: WALES }, SY: { region: "Wales", nation: WALES },
  // Northern Ireland
  BT: { region: "Northern Ireland", nation: NI },
};

export const ALL_REGIONS = Array.from(new Set(Object.values(AREAS).map((a) => a.region)));

/** Extract the leading-letters postcode area from a full postcode. */
export function postcodeArea(postcode?: string): string | null {
  if (!postcode) return null;
  const m = postcode.trim().toUpperCase().match(/^[A-Z]{1,2}/);
  return m ? m[0] : null;
}

export function resolveRegion(postcode?: string): { region: string; nation: string } {
  const area = postcodeArea(postcode);
  if (area && AREAS[area]) return AREAS[area];
  // try single-letter fallback (e.g. "E1" → "E")
  if (area && area.length === 2 && AREAS[area[0]]) return AREAS[area[0]];
  return { region: "Unknown", nation: "United Kingdom" };
}

export function resolveGeo(input: { postcode?: string; locality?: string }): GeoLocation {
  const { region, nation } = resolveRegion(input.postcode);
  return {
    postcode: input.postcode,
    locality: input.locality,
    region,
    nation,
  };
}
