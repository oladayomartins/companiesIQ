"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { captureVisit } from "@/lib/growth/visit";

// GA4 measurement ID (public by design). Override per-env with NEXT_PUBLIC_GA_ID.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-34HW7P1KJD";

// Intent-led tracking: send a page_view only for these routes and prefixes.
// Entity detail pages (company numbers, director IDs) are never sent, so no
// identifiers leak into analytics and cardinality stays low.
const TRACKED = new Set<string>([
  "/", // marketing landing
  "/pricing",
  "/sources",
  "/sign-in",
  "/product",
  "/business-leads",
  "/company-monitoring",
  "/free-alerts",
  "/market",
  "/search",
  "/data",
  "/about",
  "/contact",
  "/company-database",
  "/companies-house-alternative",
  "/app", // dashboard (activation)
  "/app/companies",
  "/app/markets",
  "/app/industries",
  "/app/alerts",
  "/app/watchlists",
]);

// Public SEO/content sections: tracked with their real (low-cardinality) path.
const TRACKED_PREFIXES = ["/blog", "/sic", "/industry", "/alternatives", "/city", "/signals", "/use-cases"];

function trackedPath(pathname: string): string | null {
  if (TRACKED.has(pathname)) return pathname;
  // Company profiles (/company/[number]) are deliberately NOT tracked yet: a
  // JS-rendering crawler hits them and would swamp page_view (102 real users vs
  // ~9.5K bot users, Oct 2026). Re-enable as "/company/[number]" once the Vercel
  // firewall challenges that traffic and GA4 users are back to real levels.
  if (TRACKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return pathname;
  return null;
}

// Headless / automated browsers inflate GA4 (e.g. data-centre bursts with ~1s
// engagement). Skip them client-side; GA4 data filters cover the rest.
function looksAutomated(): boolean {
  const nav = navigator as Navigator & { webdriver?: boolean };
  if (nav.webdriver) return true;
  return /headless|bot|crawl|spider|lighthouse|phantom|puppeteer|playwright/i.test(nav.userAgent || "");
}

type Gtag = (...args: unknown[]) => void;

export function Analytics() {
  const pathname = usePathname();
  const configured = useRef(false);

  // Remember how this visit started (first page wins) for signup attribution.
  // Runs everywhere — it is first-party and leaves nothing behind the tab.
  useEffect(() => {
    captureVisit();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return; // don't track localhost
    if (looksAutomated()) return;
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
    const path = pathname ? trackedPath(pathname) : null;
    if (path) {
      w.gtag("event", "page_view", {
        // path/title only — query strings (search terms, ranges) are dropped on purpose
        page_path: path,
        page_location: window.location.origin + path,
        page_title: document.title,
      });
    }
  }, [pathname]);

  if (process.env.NODE_ENV !== "production") return null;
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />;
}
