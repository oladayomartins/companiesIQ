"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// GA4 measurement ID (public by design). Override per-env with NEXT_PUBLIC_GA_ID.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-34HW7P1KJD";

// Best-practice, intent-led tracking: send a page_view ONLY for these routes.
// Deliberately excluded — detail pages that carry an entity identifier
// (/app/company/[number], /app/director/[id], /app/industries/[sector]):
//   • no company numbers / director IDs leak into analytics
//   • no high-cardinality URL noise
//   • we measure acquisition + feature engagement, not which records a user views
// CompaniesIQ stays a neutral intelligence platform; GA watches the funnel + features.
const TRACKED = new Set<string>([
  "/", // marketing landing
  "/pricing",
  "/sources",
  "/sign-in",
  "/app", // dashboard (activation)
  "/app/companies",
  "/app/markets",
  "/app/industries",
  "/app/alerts",
  "/app/watchlists",
]);

type Gtag = (...args: unknown[]) => void;

export function Analytics() {
  const pathname = usePathname();
  const configured = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return; // don't track localhost
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
    w.dataLayer = w.dataLayer || [];
    if (!w.gtag) {
      w.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer!.push(arguments);
      };
    }
    // Configure once; disable auto page_view so only allowlisted routes count.
    if (!configured.current) {
      w.gtag("js", new Date());
      w.gtag("config", GA_ID, { send_page_view: false });
      configured.current = true;
    }
    if (pathname && TRACKED.has(pathname)) {
      w.gtag("event", "page_view", {
        // path/title only — query strings (search terms, ranges) are dropped on purpose
        page_path: pathname,
        page_location: window.location.origin + pathname,
        page_title: document.title,
      });
    }
  }, [pathname]);

  if (process.env.NODE_ENV !== "production") return null;
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />;
}
