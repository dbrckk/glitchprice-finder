import { memo, useCallback } from "react";
import { useDealTracker } from "./hooks/useDealTracker";
import { buildDealsCsv, buildExportFilename } from "./utils/dealExport";
import { DealCategory, DealSignal, DealSortMode } from "./types";
import {
  CATEGORY_LABELS,
  SORT_LABELS,
  formatCurrency,
  formatRelativeTime,
  getOpportunityScore,
  getSavings,
} from "./utils/dealScoring";

const CATEGORIES: DealCategory[] = ["all", "tech", "home", "gaming", "fashion", "travel"];
const SORT_MODES = Object.keys(SORT_LABELS) as DealSortMode[];

function StockLabel({ stock }: { stock: DealSignal["stock"] }) {
  const label = stock === "low" ? "Stock bas" : stock === "medium" ? "Stock moyen" : "Stock OK";
  return <span className={`stock-pill stock-pill--${stock}`}>{label}</span>;
}

const DealCard = memo(function DealCard({
  deal,
  isTracked,
  onToggleWatchlist,
  onVerify,
}: {
  deal: DealSignal;
  isTracked: boolean;
  onToggleWatchlist: (dealId: string) => void;
  onVerify: (dealId: string) => void;
}) {
  const maxPrice = Math.max(...deal.priceHistory.map((snapshot) => snapshot.price), deal.referencePrice);
  const opportunityScore = getOpportunityScore(deal);

  return (
    <article className={`deal-card ${isTracked ? "deal-card--tracked" : ""}`}>
      <div className="deal-card__icon" aria-hidden="true">
        {deal.image}
      </div>

      <div className="deal-card__content">
        <div className="deal-card__header">
          <div>
            <p className="eyebrow">
              {deal.merchant} • {CATEGORY_LABELS[deal.category]} • {formatRelativeTime(deal.detectedAt)}
            </p>
            <h3>{deal.title}</h3>
          </div>
          <div className="deal-badges">
            <span className={`status status--${deal.verificationStatus}`}>
              {deal.verificationStatus === "verified"
                ? "Vérifié"
                : deal.verificationStatus === "checking"
                  ? "Check"
                  : deal.verificationStatus === "expired"
                    ? "Expiré"
                    : "Suivi"}
            </span>
            <StockLabel stock={deal.stock} />
          </div>
        </div>

        <div className="price-row">
          <strong>{formatCurrency(deal.price, deal.currency)}</strong>
          <span>{formatCurrency(deal.referencePrice, deal.currency)}</span>
          <mark>-{deal.discountPercent}%</mark>
        </div>

        <div className="deal-score-grid" aria-label="Scores du deal">
          <div>
            <small>Confiance</small>
            <strong>{deal.confidenceScore}%</strong>
            <div className="confidence-meter" aria-hidden="true">
              <span style={{ width: `${deal.confidenceScore}%` }} />
            </div>
          </div>
          <div>
            <small>Opportunité</small>
            <strong>{opportunityScore}</strong>
            <div className="confidence-meter confidence-meter--warm" aria-hidden="true">
              <span style={{ width: `${Math.min(100, opportunityScore)}%` }} />
            </div>
          </div>
          <div>
            <small>Économie</small>
            <strong>{formatCurrency(getSavings(deal), deal.currency)}</strong>
          </div>
        </div>

        <div className="sparkline" aria-label="Historique du prix">
          {deal.priceHistory.map((snapshot) => (
            <span key={`${deal.id}-${snapshot.date}`} title={`${snapshot.date}: ${formatCurrency(snapshot.price, deal.currency)}`}>
              <i style={{ height: `${Math.max(18, (snapshot.price / maxPrice) * 72)}px` }} />
              <small>{snapshot.date}</small>
            </span>
          ))}
        </div>

        <div className="tag-row">
          {deal.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>

        <div className="deal-actions">
          <a href={deal.url} target="_blank" rel="noreferrer">
            Voir l'offre
          </a>
          <button type="button" onClick={() => onVerify(deal.id)} disabled={deal.verificationStatus === "checking"}>
            {deal.verificationStatus === "checking" ? "Vérification..." : "Re-vérifier"}
          </button>
          <button type="button" className={isTracked ? "is-active" : ""} onClick={() => onToggleWatchlist(deal.id)}>
            {isTracked ? "Retirer du suivi" : "Suivre"}
          </button>
        </div>
      </div>
    </article>
  );
});

function App() {
  const {
    sources,
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

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">GlitchPrice Finder • moteur 100% free-tier ready</p>
          <h1>Radar autonome de promotions extrêmes et erreurs de prix.</h1>
          <p>
            Centralise les signaux, score les opportunités, priorise les alertes et simule un scan multi-sources gratuit
            avec persistance locale en attendant le branchement Supabase/Firebase free-tier.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={startFreeScan} disabled={scanJob?.status === "running"}>
              {scanJob?.status === "running" ? "Scan en cours..." : "Lancer un scan gratuit"}
            </button>
            <button type="button" className="button-secondary" onClick={resetDemoData}>
              Réinitialiser la démo
            </button>
            <span>{sources.length} sources publiques configurées</span>
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
                <p>Diminue la remise minimale, désactive les filtres stricts ou lance un nouveau scan gratuit.</p>
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
