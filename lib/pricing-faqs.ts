// Pricing FAQ data — plain module so both the server page (FAQPage JSON-LD)
// and the client pricing screen (rendering) can import the same source.
export const FAQS: [string, string][] = [
  ["Where does the data come from?", "Every record originates from the UK public register (Companies House), reused under the Open Government Licence and refreshed daily."],
  ["Can I try it before paying?", "Yes — the Free plan is free forever, with no card and no time limit: search the whole register, view public company profiles and read the trend dashboards. Paid plans start when you need full reports, alerts, watchlists or export."],
  ["Do you offer an API?", "Team and Enterprise include API access. Analyst is UI-only. Rate limits are listed per plan."],
  ["Can I cancel anytime?", "Monthly plans cancel anytime. Annual plans run for the term but can be set not to renew."],
];
