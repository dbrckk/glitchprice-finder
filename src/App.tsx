import { useDealTracker } from "./hooks/useDealTracker";
import { DealCategory, DealSignal } from "./types";
import { formatCurrency, formatRelativeTime } from "./utils/dealScoring";

const CATEGORIES: Array<{ label: string; value: DealCategory }> = [
  { label: "Tous", value: "all" },
  { label: "Tech", value: "tech" },
  { label: "Maison", value: "home" },
  { label: "Gaming", value: "gaming" },
  { label: "Mode", value: "fashion" },
  { label: "Voyage", value: "travel" },
];

function DealCard({
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
  const maxPrice = Math.max(...deal.priceHistory.map((snapshot) => snapshot.price));

  return (
    <article className="deal-card">
      <div className="deal-card__icon" aria-hidden="true">
        {deal.image}
      </div>

      <div className="deal-card__content">
        <div className="deal-card__header">
          <div>
            <p className="eyebrow">{deal.merchant} • {formatRelativeTime(deal.detectedAt)}</p>
            <h3>{deal.title}</h3>
          </div>
          <span className={`status status--${deal.verificationStatus}`}>
            {deal.verificationStatus === "verified" ? "Vérifié" : deal.verificationStatus === "checking" ? "Check" : "Suivi"}
          </span>
        </div>

        <div className="price-row">
          <strong>{formatCurrency(deal.price, deal.currency)}</strong>
          <span>{formatCurrency(deal.referencePrice, deal.currency)}</span>
          <mark>-{deal.discountPercent}%</mark>
        </div>

        <div className="confidence-meter" aria-label={`Score de confiance ${deal.confidenceScore}%`}>
          <span style={{ width: `${deal.confidenceScore}%` }} />
        </div>

        <div className="sparkline" aria-label="Historique du prix">
          {deal.priceHistory.map((snapshot) => (
            <span key={snapshot.date} title={`${snapshot.date}: ${formatCurrency(snapshot.price, deal.currency)}`}>
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
          <button type="button" onClick={() => onVerify(deal.id)}>
            Re-vérifier
          </button>
          <button type="button" className={isTracked ? "is-active" : ""} onClick={() => onToggleWatchlist(deal.id)}>
            {isTracked ? "Retirer du suivi" : "Suivre"}
          </button>
        </div>
      </div>
    </article>
  );
}

function App() {
  const {
    sources,
    deals,
    metrics,
    activeCategory,
    scanJob,
    watchlist,
    setActiveCategory,
    startFreeScan,
    toggleWatchlist,
    verifyDeal,
  } = useDealTracker();

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">GlitchPrice Finder • moteur 100% free-tier ready</p>
          <h1>Radar autonome de promotions extrêmes et erreurs de prix.</h1>
          <p>
            Centralise les signaux, score les opportunités, simule un scan multi-sources gratuit et garde une watchlist
            persistante dans le navigateur en attendant le branchement backend.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={startFreeScan} disabled={scanJob?.status === "running"}>
              {scanJob?.status === "running" ? "Scan en cours..." : "Lancer un scan gratuit"}
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
        </aside>
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
              </a>
            ))}
          </div>
        </aside>

        <section className="deal-panel">
          <div className="section-heading section-heading--inline">
            <div>
              <p className="eyebrow">Opportunités triées par score</p>
              <h2>Deals détectés</h2>
            </div>
            <div className="category-tabs" role="tablist" aria-label="Filtres catégories">
              {CATEGORIES.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  className={activeCategory === category.value ? "is-selected" : ""}
                  onClick={() => setActiveCategory(category.value)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="deal-list">
            {deals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                isTracked={watchlist.includes(deal.id)}
                onToggleWatchlist={toggleWatchlist}
                onVerify={verifyDeal}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
