import { renderOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og-template";

// Site-wide default Open Graph image (homepage + any page without its own).
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "CompaniesIQ — UK company intelligence platform";

export default function Image() {
  return renderOg({
    eyebrow: "UK company intelligence",
    title: "Spot new business the day it appears",
    sub: "Newly registered companies, growing sectors & new-company alerts",
  });
}
