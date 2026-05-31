import { useCallback, useMemo } from "react";
import { DealCard } from "./components/DealCard";
import { InsightGrid } from "./components/InsightGrid";
import { useDealTracker } from "./hooks/useDealTracker";
import { buildDealsCsv, buildExportFilename } from "./utils/dealExport";
import { buildDealInsights } from "./utils/dealInsights";
import { DealCategory, DealSortMode } from "./types";
import {
  CATEGORY_LABELS,
  SORT_LABELS,
  formatCurrency,
  formatRelativeTime,
} from "./utils/dealScoring";

const CATEGORIES: DealCategory[] = ["all", "tech", "home", "gaming", "fashion", "travel"];
const SORT_MODES = Object.keys(SORT_LABELS) as DealSortMode[];

function App() {
  const {
    sources,
    liveScanPolicy,
    deals,
    allDeals,
    metrics,
    categoryCounts,
    alerts,
    activeCategory,
    filters,
    scanJob,
    scanEvents,
    watchlist,
    setActiveCategory,
    updateFilters,
    clearFilters,
    resetDemoData,
    startFreeScan,
    toggleWatchlist,
    verifyDeal,
  } = useDealTracker();

  const exportVisibleDeals = useCallback(() => {
    const csvContent = buildDealsCsv(deals);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = buildExportFilename();
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }, [deals]);
  const insights = useMemo(() => buildDealInsights(allDeals, watchlist), [allDeals, watchlist]);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">GlitchPrice Finder • scanner réel France</p>
          <h1>Radar autonome de promotions extrêmes et erreurs de prix.</h1>
          <p>
            Centralise de vrais signaux live, score les opportunités, priorise les alertes et recharge le dernier scan public
            généré côté Node à partir de sources publiques actives.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={startFreeScan} disabled={scanJob?.status === "running"}>
              {scanJob?.status === "running" ? "Chargement live..." : "Recharger les deals réels"}
            </button>
            <button type="button" className="button-secondary" onClick={resetDemoData}>
              Vider le cache local
            </button>
            <span>{sources.length} sources réelles configurées</span>
          </div>
        </div>

        <aside className="scan-console" aria-label="Console de scan">
          <div className="scan-console__topline">
            <span>{scanJob?.status === "completed" ? "Terminé" : scanJob?.status === "running" ? "Running" : "Prêt"}</span>
            <strong>{scanJob?.progress ?? 0}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${scanJob?.progress ?? 0}%` }} />
          </div>
          <dl>
            <div>
              <dt>Sources scannées</dt>
              <dd>{scanJob?.scannedSources ?? 0}/{sources.length}</dd>
            </div>
            <div>
              <dt>Deals détectés</dt>
              <dd>{scanJob?.detectedDeals ?? 0}</dd>
            </div>
          </dl>
          <div className="event-stream" aria-label="Journal du scanner">
            {scanEvents.map((event) => (
              <p key={event.id} className={`event-stream__item event-stream__item--${event.severity}`}>
                <span>{formatRelativeTime(event.timestamp)}</span>
                {event.label}
              </p>
            ))}
          </div>
        </aside>
      </section>

      <section className="live-policy-panel" aria-label="Politique scan réel">
        <strong>Scan réel France</strong>
        <span>Livraison France obligatoire</span>
        <span>Remise minimum {liveScanPolicy.minimumDiscountPercent}%</span>
        <span>{liveScanPolicy.sourceCount} sources publiques</span>
        <code>{liveScanPolicy.lastLocalScanArtifact}</code>
      </section>

      <section className="alert-grid" aria-label="Alertes prioritaires">
        {alerts.map((alert) => (
          <article key={alert.id} className={`alert-card alert-card--${alert.severity}`}>
            <span>{alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚡" : "🧠"}</span>
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="metric-grid" aria-label="Indicateurs tracking">
        <div>
          <span>Remise moyenne</span>
          <strong>{metrics.averageDiscount}%</strong>
        </div>
        <div>
          <span>Score ≥ 85</span>
          <strong>{metrics.highConfidenceDeals}</strong>
        </div>
        <div>
          <span>Stock bas</span>
          <strong>{metrics.lowStockDeals}</strong>
        </div>
        <div>
          <span>Économies potentielles</span>
          <strong>{formatCurrency(metrics.potentialSavings)}</strong>
        </div>
        <div>
          <span>Watchlist filtrée</span>
          <strong>{metrics.trackedDeals}</strong>
        </div>
        <div>
          <span>Deals vérifiés</span>
          <strong>{metrics.verifiedDeals}</strong>
        </div>
      </section>

      <InsightGrid insights={insights} />

      <section className="workspace-grid">
        <aside className="source-panel">
          <div className="section-heading">
            <p className="eyebrow">Pipeline</p>
            <h2>Sources gratuites</h2>
          </div>
          <div className="source-list">
            {sources.map((source) => (
              <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="source-card">
                <span>{source.name}</span>
                <small>{source.cadenceMinutes} min • fiabilité {source.reliability}%</small>
                <em>{CATEGORY_LABELS[source.category]}</em>
              </a>
            ))}
          </div>
        </aside>

        <section className="deal-panel">
          <div className="section-heading section-heading--inline">
            <div>
              <p className="eyebrow">{deals.length}/{allDeals.length} opportunités affichées</p>
              <h2>Deals détectés</h2>
            </div>
            <div className="category-tabs" role="tablist" aria-label="Filtres catégories">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={activeCategory === category ? "is-selected" : ""}
                  onClick={() => setActiveCategory(category)}
                >
                  {CATEGORY_LABELS[category]} <span>{categoryCounts[category]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="filter-panel" aria-label="Filtres avancés">
            <label>
              Recherche
              <input
                type="search"
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder="merchant, produit, tag..."
              />
            </label>
            <label>
              Remise min. {filters.minDiscount}%
              <input
                type="range"
                min="0"
                max="80"
                step="5"
                value={filters.minDiscount}
                onChange={(event) => updateFilters({ minDiscount: Number(event.target.value) })}
              />
            </label>
            <label>
              Tri
              <select
                value={filters.sortMode}
                onChange={(event) => updateFilters({ sortMode: event.target.value as DealSortMode })}
              >
                {SORT_MODES.map((mode) => (
                  <option key={mode} value={mode}>{SORT_LABELS[mode]}</option>
                ))}
              </select>
            </label>
            <label className="checkbox-pill">
              <input
                type="checkbox"
                checked={filters.onlyVerified}
                onChange={(event) => updateFilters({ onlyVerified: event.target.checked })}
              />
              Vérifiés uniquement
            </label>
            <label className="checkbox-pill">
              <input
                type="checkbox"
                checked={filters.watchlistOnly}
                onChange={(event) => updateFilters({ watchlistOnly: event.target.checked })}
              />
              Watchlist ({watchlist.length})
            </label>
            <button type="button" className="button-secondary" onClick={clearFilters}>
              Effacer filtres
            </button>
            <button type="button" className="button-secondary" onClick={exportVisibleDeals} disabled={!deals.length}>
              Export CSV
            </button>
          </div>

          <div className="deal-list">
            {deals.length > 0 ? (
              deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  isTracked={watchlist.includes(deal.id)}
                  onToggleWatchlist={toggleWatchlist}
                  onVerify={verifyDeal}
                />
              ))
            ) : (
              <div className="empty-state">
                <strong>Aucun deal ne correspond aux filtres.</strong>
                <p>Diminue la remise minimale, désactive les filtres stricts ou recharge le dernier scan réel.</p>
                <button type="button" onClick={clearFilters}>Réinitialiser les filtres</button>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
