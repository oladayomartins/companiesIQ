import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Supabase is the only first-party-configured origin the browser talks to.
const supabaseOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  } catch {
    return "";
  }
})();

// Content-Security-Policy. Next.js hydration and the JSON-LD blocks are inline
// scripts, and a nonce would force every page dynamic (losing static/ISR), so
// script-src keeps 'unsafe-inline'. The rest of the policy still removes the
// high-value attack paths: framing, plugins, <base> hijack, off-site form
// posts and connections to origins we don't use.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // Blog covers come from arbitrary https hosts.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com`.replace(/\s+/g, " "),
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Only where TLS is guaranteed: locally it would upgrade `next start` redirects to https://localhost.
  ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework in every response.
  poweredByHeader: false,
  experimental: {
    typedRoutes: false,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // The company report moved out of the gated app to the public SEO route.
      { source: "/app/company/:number", destination: "/company/:number", permanent: true },
      // The founder funnel moved to its private, noindex home.
      { source: "/company/:number/growth-report", destination: "/visibility-review/:number", permanent: false },
    ];
  },
};

export default nextConfig;
