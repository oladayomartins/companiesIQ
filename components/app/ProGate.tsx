import { Icon, Button, Card, CardBody, type IconName } from "@/components/ds";
import { ENTRY_PAID_PLAN } from "@/lib/subscription";

/**
 * Upgrade wall for paid features (watchlists, company search, market
 * intelligence). Free accounts get the public/preview surface.
 *
 * It shows the *shape* of the screen behind the gate rather than replacing the
 * page: "Watchlists is included in Analyst" on an otherwise blank page teaches
 * the reader nothing about what they'd be buying.
 *
 * The preview is a skeleton, never the real rows. A CSS blur is a visual
 * effect, not access control — anything rendered behind it is still in the DOM
 * and one devtools toggle away. So nothing gated is fetched or rendered here.
 */
export type PreviewShape = "list" | "grid" | "table";

function Skeleton({ shape }: { shape: PreviewShape }) {
  if (shape === "grid") {
    return (
      <div className="gate-skel gate-skel--grid">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i}>
            <CardBody>
              <span className="gate-skel__bar" style={{ width: "45%", height: 11 }} />
              <span className="gate-skel__bar" style={{ width: "72%", height: 22, marginTop: 12 }} />
              <span className="gate-skel__bar" style={{ width: "58%", height: 10, marginTop: 10 }} />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }
  if (shape === "table") {
    return (
      <Card className="gate-skel gate-skel--table">
        <CardBody>
          {Array.from({ length: 8 }, (_, i) => (
            <div className="gate-skel__row" key={i}>
              <span className="gate-skel__dot" />
              <span className="gate-skel__bar" style={{ width: `${52 - (i % 4) * 7}%` }} />
              <span className="gate-skel__bar gate-skel__bar--sm" style={{ width: 64 }} />
              <span className="gate-skel__bar gate-skel__bar--sm" style={{ width: 44 }} />
            </div>
          ))}
        </CardBody>
      </Card>
    );
  }
  return (
    <div className="gate-skel gate-skel--list">
      {Array.from({ length: 5 }, (_, i) => (
        <Card key={i}>
          <CardBody>
            <div className="gate-skel__row">
              <span className="gate-skel__dot" />
              <span className="gate-skel__bar" style={{ width: `${58 - (i % 3) * 9}%` }} />
              <span className="gate-skel__bar gate-skel__bar--sm" style={{ width: 72 }} />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

export function ProGate({
  icon,
  title,
  features,
  shape = "list",
}: {
  icon: IconName;
  title: string;
  features: string[];
  shape?: PreviewShape;
}) {
  return (
    <div className="screen">
      <div className="locked-intel locked-intel--gate">
        <div className="locked-intel__blur" aria-hidden="true">
          <Skeleton shape={shape} />
        </div>
        <div className="locked-intel__overlay">
          <Card variant="raised" className="locked-intel__card">
            <CardBody>
              <span className="locked-intel__icon">
                <Icon name={icon} size={26} />
              </span>
              <h1 className="locked-intel__title">
                {title} is included in {ENTRY_PAID_PLAN.name}
              </h1>
              <p className="locked-intel__sub">
                Upgrade to unlock {title.toLowerCase()} — plus full intelligence reports, CSV exports and 10-year
                filing history.
              </p>
              <ul className="progate__list">
                {features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={15} color="var(--accent)" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              <div className="locked-intel__cta">
                <Button href="/app/upgrade" variant="primary" iconRight="arrowRight">
                  See plans
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
