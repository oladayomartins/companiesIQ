import { Badge } from "@/components/ds";
import { factualTags } from "@/lib/tags";

export function FactualTags({ incorporated, sector, sicCodes, status }: { incorporated?: string; sector?: string; sicCodes?: string[]; status?: string }) {
  const tags = factualTags({ incorporated, sector, sicCodes, status });
  if (!tags.length) return <span className="muted">—</span>;
  return (
    <span className="kw-chips">
      {tags.map((t) => (
        <Badge key={t.label} tone={t.tone}>
          {t.label}
        </Badge>
      ))}
    </span>
  );
}
