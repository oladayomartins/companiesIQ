// Curated list of major UK cities/towns for the public /city SEO pages, each
// mapped to a REGION_STATS region so we can roll up regional economics and link
// to the matching /market page. Company data is pulled live by registered-office
// locality (Companies House `location` search).
import { slugify } from "@/lib/slug";

export interface City {
  name: string;
  region: string; // must match a REGION_STATS key
}

export const CITIES: City[] = [
  { name: "London", region: "London" },
  { name: "Manchester", region: "North West" },
  { name: "Liverpool", region: "North West" },
  { name: "Preston", region: "North West" },
  { name: "Birmingham", region: "West Midlands" },
  { name: "Coventry", region: "West Midlands" },
  { name: "Wolverhampton", region: "West Midlands" },
  { name: "Leeds", region: "Yorkshire & the Humber" },
  { name: "Sheffield", region: "Yorkshire & the Humber" },
  { name: "Bradford", region: "Yorkshire & the Humber" },
  { name: "Hull", region: "Yorkshire & the Humber" },
  { name: "Newcastle upon Tyne", region: "North East" },
  { name: "Sunderland", region: "North East" },
  { name: "Middlesbrough", region: "North East" },
  { name: "Nottingham", region: "East Midlands" },
  { name: "Leicester", region: "East Midlands" },
  { name: "Derby", region: "East Midlands" },
  { name: "Bristol", region: "South West" },
  { name: "Plymouth", region: "South West" },
  { name: "Exeter", region: "South West" },
  { name: "Bournemouth", region: "South West" },
  { name: "Brighton", region: "South East" },
  { name: "Reading", region: "South East" },
  { name: "Oxford", region: "South East" },
  { name: "Milton Keynes", region: "South East" },
  { name: "Southampton", region: "South East" },
  { name: "Portsmouth", region: "South East" },
  { name: "Cambridge", region: "East of England" },
  { name: "Norwich", region: "East of England" },
  { name: "Luton", region: "East of England" },
  { name: "Ipswich", region: "East of England" },
  { name: "Glasgow", region: "Scotland" },
  { name: "Edinburgh", region: "Scotland" },
  { name: "Aberdeen", region: "Scotland" },
  { name: "Dundee", region: "Scotland" },
  { name: "Cardiff", region: "Wales" },
  { name: "Swansea", region: "Wales" },
  { name: "Newport", region: "Wales" },
  { name: "Belfast", region: "Northern Ireland" },
];

export function cityForSlug(slug: string): City | null {
  return CITIES.find((c) => slugify(c.name) === slug) ?? null;
}
