import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";
import { Toaster } from "@/components/ui/Toaster";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/site";

const DEFAULT_TITLE = "CompaniesIQ — UK company intelligence platform";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: "%s · CompaniesIQ",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  icons: { icon: "/logo/ciq-mark.svg" },
  openGraph: {
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
};

const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  logo: `${SITE_URL}/logo/ciq-mark.svg`,
};

const SITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,500&family=Hanken+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&display=swap"
        />
      </head>
      <body>
        {children}
        <Toaster />
        <Analytics />
        <JsonLd data={[ORG_SCHEMA, SITE_SCHEMA]} />
      </body>
    </html>
  );
}
