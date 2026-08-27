import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export interface Crumb {
  /** Omit href on the final crumb — the current page is not a link. */
  href?: string;
  label: string;
}

/**
 * Breadcrumb trail + BreadcrumbList JSON-LD for the public data pages.
 *
 * These pages previously had no breadcrumb at all, so a visitor landing on a
 * sector or city page from search had nothing telling them where they were or
 * how to climb. Additive: it adds a nav and a JSON-LD block, and changes no
 * existing markup, heading or link.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const items = crumbs.map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.label,
    ...(c.href ? { item: `${SITE_URL}${c.href}` } : {}),
  }));

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items }} />
      <nav aria-label="Breadcrumb" className="crumbs">
        <ol className="crumbs__list">
          {crumbs.map((c, i) => (
            <li className="crumbs__item" key={`${c.label}-${i}`}>
              {c.href ? (
                <Link className="crumbs__link" href={c.href}>
                  {c.label}
                </Link>
              ) : (
                <span className="crumbs__here" aria-current="page">
                  {c.label}
                </span>
              )}
              {i < crumbs.length - 1 ? (
                <span className="crumbs__sep" aria-hidden="true">
                  /
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

/**
 * Dataset JSON-LD for a public data page. These pages ARE datasets — say so in
 * the markup rather than letting them read as generic web pages.
 *
 * `dateModified` and `temporalCoverage` come from live values, never a build
 * constant, so the markup can't drift from what the page shows.
 */
export function DatasetLd({
  name,
  description,
  path,
  dateModified,
  temporalCoverage,
}: {
  name: string;
  description: string;
  path: string;
  dateModified: string;
  temporalCoverage?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Dataset",
        name,
        description,
        url: `${SITE_URL}${path}`,
        dateModified,
        ...(temporalCoverage ? { temporalCoverage } : {}),
        license: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/",
        creator: { "@type": "Organization", name: "CompaniesIQ Ltd", url: SITE_URL },
        isBasedOn: [
          { "@type": "Dataset", name: "Companies House company register", url: "https://find-and-update.company-information.service.gov.uk/" },
          { "@type": "Dataset", name: "ONS business demography & Nomis labour market statistics", url: "https://www.nomisweb.co.uk/" },
        ],
        includedInDataCatalog: { "@type": "DataCatalog", name: "CompaniesIQ", url: `${SITE_URL}/sources` },
      }}
    />
  );
}
