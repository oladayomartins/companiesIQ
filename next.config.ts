import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
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
