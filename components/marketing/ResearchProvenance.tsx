// Provenance strip for a research edition — shown directly under the title so
// the period, the source and the retrieval date are visible before a single
// figure is read, and the raw data is one click away. Trust signals belong
// above the content they qualify, not in a footnote.
import type { Dataset } from "@/lib/research/types";

export function ResearchProvenance({ dataset }: { dataset: Dataset }) {
  const d = dataset;
  return (
    <aside className="rs-prov" aria-label="Data provenance">
      <div className="rs-prov__badge">Primary research</div>
      <dl className="rs-prov__grid">
        <div>
          <dt>Period measured</dt>
          <dd>
            {d.period.from} to {d.period.to}
          </dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>Companies House register</dd>
        </div>
        <div>
          <dt>Data retrieved</dt>
          <dd>{d.source.retrieved.slice(0, 10)}</dd>
        </div>
        <div>
          <dt>Register queries</dt>
          <dd>{d.queries.length.toLocaleString("en-GB")} exact counts</dd>
        </div>
      </dl>
      <div className="rs-prov__links">
        <a href={`/api/research/${d.slug}/data.csv`}>Download CSV</a>
        <a href={`/api/research/${d.slug}/dataset.json`}>JSON</a>
        <a href="/sources">Data sources</a>
      </div>
    </aside>
  );
}
