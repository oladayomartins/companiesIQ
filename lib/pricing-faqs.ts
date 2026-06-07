// Pricing FAQ data — plain module so both the server page (FAQPage JSON-LD)
// and the client pricing screen (rendering) can import the same source.
export const FAQS: [string, string][] = [
  ["Where does the data come from?", "Every record originates from the UK public register (Companies House), reused under the Open Government Licence and refreshed daily."],
  ["Can I try it before paying?", "Yes — search is free forever and every paid plan starts with a 14-day trial. No card required to start."],
  ["Do you offer an API?", "Team and Enterprise include API access. Analyst is UI-only. Rate limits are listed per plan."],
  ["Can I cancel anytime?", "Monthly plans cancel anytime. Annual plans run for the term but can be set not to renew."],
];
