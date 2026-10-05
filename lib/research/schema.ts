// ============================================================
// Research pipeline — structured data
// ------------------------------------------------------------
// A research report is two things to a machine: an article, and
// the dataset it reports on. Emitting Dataset alongside the
// article is what makes an edition eligible to be treated as a
// primary source — it declares the measurement period, the
// licence, the provenance and a machine-readable distribution
// (CSV and JSON) rather than leaving the numbers stranded in prose.
// ============================================================
import { SITE_NAME, SITE_URL } from "@/lib/site";
import type { Dataset } from "./types";

export function datasetId(slug: string): string {
  return `${SITE_URL}/blog/${slug}#dataset`;
}

export function datasetLd(d: Dataset): Record<string, unknown> {
  const page = `${SITE_URL}/blog/${d.slug}`;
  const measured = d.series.map((s) => ({
    "@type": "PropertyValue",
    name: s.label,
    unitText: s.unit,
  }));
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": datasetId(d.slug),
    name: d.title,
    description: `${d.title}. Exact counts from the Companies House register for ${d.period.from} to ${d.period.to}, with the query behind every figure.`,
    url: page,
    identifier: d.slug,
    temporalCoverage: `${d.period.from}/${d.period.to}`,
    spatialCoverage: { "@type": "Place", name: "United Kingdom" },
    dateModified: d.generatedAt,
    datePublished: d.generatedAt,
    license: d.source.licenceUrl,
    isAccessibleForFree: true,
    creator: { "@type": "Organization", name: `${SITE_NAME} Research`, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    sourceOrganization: { "@type": "Organization", name: "Companies House", url: "https://www.gov.uk/government/organisations/companies-house" },
    isBasedOn: d.source.url,
    measurementTechnique: `Exact hit counts from the Companies House advanced company search API, one query per measured row${
      d.sampleSize ? `, with candidate rows identified from a stratified sample of ${d.sampleSize} incorporations` : ""
    }.`,
    variableMeasured: measured,
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: `${SITE_URL}/api/research/${d.slug}/data.csv`,
      },
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: `${SITE_URL}/api/research/${d.slug}/dataset.json`,
      },
    ],
  };
}

/** Fields merged into the article schema when the post is a research edition. */
export function researchArticleExtras(d: Dataset): Record<string, unknown> {
  return {
    "@type": ["BlogPosting", "Report"],
    isBasedOn: { "@id": datasetId(d.slug) },
    license: d.source.licenceUrl,
    temporalCoverage: `${d.period.from}/${d.period.to}`,
    citation: `${SITE_NAME} Research (${new Date(d.generatedAt).getFullYear()}). ${d.title}. ${SITE_URL}/blog/${d.slug}`,
    creativeWorkStatus: "Published",
  };
}
