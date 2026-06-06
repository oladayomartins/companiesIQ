// ============================================================
// SIC classification engine
// ------------------------------------------------------------
// Raw SIC 2007 codes (e.g. "62012") mean little to most users.
// This engine resolves any 5-digit code into:
//   · a readable category   (e.g. "Software development")
//   · a top-level sector     (e.g. "Technology")
//   · the SIC division label (e.g. "Computer programming...")
// Every UK company carries one or more SIC codes; this is the
// backbone of all industry intelligence in CompaniesIQ.
// Source: ONS UK SIC 2007.
// ============================================================
import type { SicClassification } from "./types";

// --- SIC sections → high-level sector (by 2-digit division range) ---
interface SectionDef {
  sector: string;
  min: number;
  max: number;
}
const SECTIONS: SectionDef[] = [
  { sector: "Agriculture & fishing", min: 1, max: 3 },
  { sector: "Mining & extraction", min: 5, max: 9 },
  { sector: "Manufacturing", min: 10, max: 33 },
  { sector: "Energy & utilities", min: 35, max: 35 },
  { sector: "Water & waste", min: 36, max: 39 },
  { sector: "Construction", min: 41, max: 43 },
  { sector: "Retail & wholesale", min: 45, max: 47 },
  { sector: "Transport & logistics", min: 49, max: 53 },
  { sector: "Hospitality", min: 55, max: 56 },
  { sector: "Technology", min: 58, max: 63 },
  { sector: "Financial services", min: 64, max: 66 },
  { sector: "Real estate", min: 68, max: 68 },
  { sector: "Professional services", min: 69, max: 75 },
  { sector: "Business support", min: 77, max: 82 },
  { sector: "Public administration", min: 84, max: 84 },
  { sector: "Education", min: 85, max: 85 },
  { sector: "Healthcare & social", min: 86, max: 88 },
  { sector: "Arts & recreation", min: 90, max: 93 },
  { sector: "Other services", min: 94, max: 96 },
  { sector: "Households & other", min: 97, max: 99 },
];

// --- SIC divisions → division description (2-digit) ---
const DIVISIONS: Record<string, string> = {
  "01": "Crop & animal production",
  "10": "Manufacture of food products",
  "11": "Manufacture of beverages",
  "41": "Construction of buildings",
  "42": "Civil engineering",
  "43": "Specialised construction",
  "45": "Motor vehicle trade",
  "46": "Wholesale trade",
  "47": "Retail trade",
  "49": "Land transport",
  "52": "Warehousing & support for transport",
  "55": "Accommodation",
  "56": "Food & beverage service",
  "58": "Publishing",
  "59": "Film, video & TV production",
  "60": "Broadcasting",
  "61": "Telecommunications",
  "62": "Computer programming & consultancy",
  "63": "Information service activities",
  "64": "Financial services",
  "65": "Insurance & pensions",
  "66": "Auxiliary financial services",
  "68": "Real estate activities",
  "69": "Legal & accounting",
  "70": "Head office & management consultancy",
  "71": "Architectural & engineering",
  "72": "Scientific research & development",
  "73": "Advertising & market research",
  "74": "Other professional, scientific & technical",
  "75": "Veterinary activities",
  "77": "Rental & leasing",
  "78": "Employment activities",
  "79": "Travel agency & tour operators",
  "80": "Security & investigation",
  "81": "Services to buildings & landscape",
  "82": "Office administrative & support",
  "85": "Education",
  "86": "Human health activities",
  "87": "Residential care",
  "88": "Social work without accommodation",
  "90": "Creative, arts & entertainment",
  "93": "Sports & recreation",
  "96": "Other personal service activities",
};

// --- Curated friendly categories for the most common 5-digit codes ---
const CODE_CATEGORY: Record<string, string> = {
  "62011": "Ready-made software development",
  "62012": "Software development",
  "62020": "IT consultancy",
  "62090": "Information technology services",
  "63110": "Data processing & hosting",
  "63120": "Web portals",
  "58210": "Games publishing",
  "58290": "Software publishing",
  "61100": "Wired telecommunications",
  "61900": "Telecommunications activities",
  "64205": "Activities of financial holding companies",
  "64191": "Banks",
  "64999": "Financial services n.e.c.",
  "66190": "Activities auxiliary to financial services",
  "66220": "Insurance broking",
  "64301": "Investment trusts",
  "64303": "Activities of venture & development capital companies",
  "68100": "Buying & selling own real estate",
  "68209": "Letting of own real estate",
  "68320": "Property management",
  "69101": "Solicitors",
  "69109": "Legal activities",
  "69201": "Accounting & auditing",
  "69202": "Bookkeeping",
  "69203": "Tax consultancy",
  "70229": "Management consultancy",
  "70210": "Public relations & communications",
  "71111": "Architectural activities",
  "71121": "Engineering design",
  "72190": "Research in natural sciences & engineering",
  "73110": "Advertising agencies",
  "73200": "Market research & polling",
  "74100": "Specialised design activities",
  "74201": "Portrait photography",
  "47110": "Retail in non-specialised stores",
  "47190": "Other retail in non-specialised stores",
  "47910": "Retail via mail order or internet",
  "46900": "Non-specialised wholesale trade",
  "56101": "Licensed restaurants",
  "56103": "Take-away food shops",
  "55100": "Hotels & similar accommodation",
  "41100": "Development of building projects",
  "41202": "Construction of domestic buildings",
  "43999": "Specialised construction activities",
  "85590": "Other education n.e.c.",
  "86900": "Other human health activities",
  "86210": "General medical practice",
  "87300": "Residential care for the elderly & disabled",
  "88100": "Social work for the elderly & disabled",
  "90030": "Artistic creation",
  "93120": "Sports club activities",
  "96020": "Hairdressing & beauty treatment",
  "82990": "Business support service activities n.e.c.",
  "82190": "Photocopying, document preparation & office support",
  "35110": "Production of electricity",
  "35140": "Trade of electricity",
  "10110": "Processing & preserving of meat",
  "11010": "Distilling & blending of spirits",
  "01130": "Growing of vegetables & melons",
  "99999": "Dormant company",
  "98000": "Residents property management",
  "74909": "Other professional & technical activities n.e.c.",
};

// Light-touch raw descriptions for codes not in the curated map.
function titleize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function sectorForDivision(divNum: number): string {
  const s = SECTIONS.find((x) => divNum >= x.min && divNum <= x.max);
  return s ? s.sector : "Other";
}

export function classifySic(code: string, rawDescription?: string): SicClassification {
  const clean = (code || "").trim();
  const div = clean.slice(0, 2);
  const divNum = parseInt(div, 10);
  const division = DIVISIONS[div] || (Number.isNaN(divNum) ? "Unclassified" : `SIC division ${div}`);
  const sector = Number.isNaN(divNum) ? "Other" : sectorForDivision(divNum);
  const category =
    CODE_CATEGORY[clean] ||
    (rawDescription ? titleize(rawDescription) : null) ||
    division;
  return {
    code: clean,
    description: rawDescription || category,
    category,
    sector,
    division,
  };
}

export function classifyMany(codes: string[], descriptions?: Record<string, string>): SicClassification[] {
  return (codes || []).filter(Boolean).map((c) => classifySic(c, descriptions?.[c]));
}

/** The list of sectors, for filters and analytics axes. */
export const ALL_SECTORS: string[] = Array.from(new Set(SECTIONS.map((s) => s.sector)));

/** A few headline categories used to seed industry-intelligence pages. */
export const FEATURED_SECTORS = [
  "Technology",
  "Financial services",
  "Professional services",
  "Construction",
  "Retail & wholesale",
  "Healthcare & social",
];
