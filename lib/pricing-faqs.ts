// Pricing FAQ data — plain module so both the server page (FAQPage JSON-LD)
// and the client pricing screen (rendering) can import the same source.
export const FAQS: [string, string][] = [
  ["Where does the data come from?", "Every record originates from the UK public register (Companies House), reused under the Open Government Licence and refreshed daily."],
  ["Can I try it before paying?", "Yes — the Free plan is free forever, with no card and no time limit: search the whole register, view public company profiles and read the trend dashboards. Paid plans start when you need full reports, alerts, watchlists or export."],
  ["Do you offer an API?", "Team and Enterprise include API access. Analyst is UI-only. Rate limits are listed per plan."],
  ["Do you include email addresses and phone numbers?", "Yes, from Analyst upwards — but only the contact details a company publishes on its own website, and always with the checks behind them: where it was found, whether the domain matches the verified site, and what we have not verified. We don't resell a bought-in contact database, and we never invent an address. Analyst includes 250 companies a month, Team 2,500, Enterprise unlimited."],
  ["How do you verify a contact detail?", "We find the company's website and first prove it's theirs — the registered company number, name or postcode has to appear on the page — then read the contact pages and record each email and phone with its source URL and date. Each value carries its own checks and a High/Medium/Low confidence. We do not probe mailboxes or ring lines, and we say so on every record rather than implying a verification we haven't done."],
  ["Can I cancel anytime?", "Monthly plans cancel anytime. Annual plans run for the term but can be set not to renew."],
];
