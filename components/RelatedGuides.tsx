import Link from "next/link";
import { Icon } from "@/components/ds";
import type { Guide } from "@/lib/guides";

// Keyword-rich internal-link block for the high-authority public pages. Plain
// crawlable <a> links (server-rendered) that flow authority to the commercial
// blog cluster. `dark` matches the company-report chrome; default suits the
// light marketing shell.
export function RelatedGuides({
  guides,
  title = "Guides & resources",
  dark = false,
}: {
  guides: Guide[];
  title?: string;
  dark?: boolean;
}) {
  if (!guides.length) return null;
  return (
    <nav className={`guides${dark ? " guides--dark" : ""}`} aria-label={title}>
      <div className="guides__title">{title}</div>
      <ul className="guides__list">
        {guides.map((g) => (
          <li key={g.href}>
            <Link href={g.href} className="guides__link">
              <Icon name="arrowRight" size={14} />
              <span>{g.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
