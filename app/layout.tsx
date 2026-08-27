import type { Metadata } from "next";
import { Archivo, Newsreader, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { JsonLd } from "@/components/JsonLd";
import { Toaster } from "@/components/ui/Toaster";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/site";

// Exactly the three families the design system calls for, self-hosted by
// next/font at build time. This replaces a render-blocking Google Fonts
// stylesheet: there is no third-party request on the critical path, the files
// are preloaded automatically, and next/font generates size-adjusted fallback
// metrics so the swap cannot shift layout (CLS stays 0 while the webfont loads).
//
//   Archivo       UI, and every data-page heading
//   Newsreader    editorial display only (marketing h1/h2)
//   JetBrains Mono  micro-labels, figures in tables, source lines
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-archivo",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-newsreader",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-jetbrains",
});

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
    <html lang="en" className={`${archivo.variable} ${newsreader.variable} ${jetbrains.variable}`}>
      <body>
        {children}
        <Toaster />
        <Analytics />
        <JsonLd data={[ORG_SCHEMA, SITE_SCHEMA]} />
      </body>
    </html>
  );
}
