// CompaniesIQ — domain types. Shapes mirror Companies House REST
// responses, normalised into the internal model used across the app.

export type CompanyStatus =
  | "active"
  | "dormant"
  | "liquidation"
  | "dissolved"
  | "administration"
  | "voluntary-arrangement"
  | "converted-closed"
  | "insolvency-proceedings"
  | "open"
  | string;

export interface SicClassification {
  code: string;
  description: string; // raw CH description
  category: string; // human category, e.g. "Software Development"
  sector: string; // top-level sector, e.g. "Technology"
  division: string; // SIC division label
}

export interface GeoLocation {
  postcode?: string;
  locality?: string; // town / city
  region: string; // ONS region, e.g. "London"
  nation: string; // England / Scotland / Wales / Northern Ireland
}

export interface Company {
  number: string;
  name: string;
  status: CompanyStatus;
  type?: string;
  incorporated?: string; // ISO date
  dissolved?: string;
  sicCodes: string[];
  classifications: SicClassification[];
  primaryClassification?: SicClassification;
  address?: {
    line1?: string;
    line2?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
  };
  geo?: GeoLocation;
  // Compliance / filing facts from the Companies House profile (Category 1 —
  // verifiable). Dates are ISO; `overdue` mirrors CH's own flag where present.
  accounts?: { nextDue?: string; lastMadeUpTo?: string; overdue?: boolean };
  confirmationStatement?: { nextDue?: string; lastMadeUpTo?: string; overdue?: boolean };
  // illustrative / enrichable fields (not from CH free API)
  employees?: number | null;
  revenue?: string | null;
}

export interface Officer {
  name: string;
  role: string;
  appointed?: string;
  resigned?: string;
  status: "active" | "resigned";
  kind?: "person" | "company";
  nationality?: string;
  occupation?: string;
  officerId?: string; // Companies House appointment/officer id (for cross-company lookup)
}

export interface OfficerAppointment {
  companyNumber: string;
  companyName: string;
  companyStatus?: string;
  role: string;
  appointed?: string;
  resigned?: string;
  active: boolean;
  sector?: string;
}

export interface OfficerProfile {
  officerId: string;
  name: string;
  dateOfBirth?: string; // "Month Year"
  nationality?: string;
  occupation?: string;
  isCorporate: boolean;
  totalAppointments: number;
  activeAppointments: number;
  appointments: OfficerAppointment[];
}

export interface Filing {
  date: string;
  type: string; // CH category code, e.g. "AA", "CS01"
  label: string;
}

export interface Charge {
  classification: string;
  status: string;
  created?: string;
  delivered?: string;
  personsEntitled?: string[];
}

export interface PSC {
  name: string;
  kind: "individual" | "corporate" | "legal-person" | "statement";
  naturesOfControl: string[]; // human-readable labels
  notifiedOn?: string;
  ceasedOn?: string;
  nationality?: string;
  countryOfResidence?: string;
  active: boolean;
}

export interface SearchResult {
  number: string;
  name: string;
  status: CompanyStatus;
  incorporated?: string;
  address?: string;
  sicCodes: string[];
  classification?: SicClassification;
  region?: string;
  locality?: string; // registered-office town / city
  postcode?: string;
  companyType?: string; // legal structure, e.g. "ltd", "llp"
}
