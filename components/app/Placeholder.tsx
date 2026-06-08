import Link from "next/link";
import { Icon, Button, type IconName } from "@/components/ds";

// Empty/coming-soon state. The CTA is optional — omit it rather than render a
// dead button.
export function Placeholder({
  title,
  sub,
  icon,
  cta,
}: {
  title: string;
  sub: string;
  icon: IconName;
  cta?: { label: string; href: string };
}) {
  return (
    <div className="screen">
      <div className="placeholder">
        <span className="placeholder__icon">
          <Icon name={icon} size={28} />
        </span>
        <h2 className="placeholder__title">{title}</h2>
        <p className="placeholder__sub">{sub}</p>
        {cta ? (
          <Link href={cta.href}>
            <Button variant="secondary">{cta.label}</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
