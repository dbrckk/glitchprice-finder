import type { LiveFeedSourceReport } from "../types";

interface SourceHealthPanelProps {
  reports: LiveFeedSourceReport[];
}

function formatDuration(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "n/a";
  if (durationMs < 1000) return `${Math.round(durationMs)} ms`;
  return `${(durationMs / 1000).toFixed(1)} s`;
}

export function SourceHealthPanel({ reports }: SourceHealthPanelProps) {
  if (!reports.length) {
    return null;
  }

  return (
    <section className="source-health-panel" aria-label="Santé détaillée des sources live">
      <div className="section-heading section-heading--inline">
        <div>
          <p className="eyebrow">Observabilité scan</p>
          <h2>Sources live inspectées</h2>
        </div>
        <span>{reports.length} rapports</span>
      </div>

      <div className="source-health-panel__grid">
        {reports.map((report) => (
          <article key={report.sourceId} className={`source-health-card source-health-card--${report.status}`}>
            <div>
              <span>{report.status === "ok" ? "OK" : "KO"}</span>
              <strong>{report.sourceName}</strong>
            </div>
            <dl>
              <div>
                <dt>Résultats</dt>
                <dd>{report.results}</dd>
              </div>
              <div>
                <dt>Durée</dt>
                <dd>{formatDuration(report.durationMs)}</dd>
              </div>
            </dl>
            {report.error ? <small>{report.error}</small> : <small>Flux exploitable pour la livraison France.</small>}
          </article>
        ))}
      </div>
    </section>
  );
}
