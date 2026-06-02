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
  const maxPrice = Math.max(...deal.priceHistory.map((snapshot) => snapshot.price), deal.referencePrice, deal.price);
  const statusLabel =
    deal.verificationStatus === "verified"
      ? "Vérifié live"
      : deal.verificationStatus === "checking"
        ? "Check live"
        : deal.verificationStatus === "expired"
          ? "Expiré"
          : "Suivi";
  const hasRemoteImage = /^https?:\/\//.test(deal.image);

  return (
    <article className="deal-card">
      <div className="deal-card__icon" aria-hidden="true">
        {hasRemoteImage ? <img src={deal.image} alt="" loading="lazy" /> : deal.image || "🔥"}
      </div>

      <div className="deal-card__content">
        <div className="deal-card__header">
          <div>
            <p className="eyebrow">{deal.merchant} • {formatRelativeTime(deal.detectedAt)}</p>
            <h3>{deal.title}</h3>
          </div>
          <span className={`status status--${deal.verificationStatus}`}>{statusLabel}</span>
        </div>

        <div className="price-row">
          <strong>{formatCurrency(deal.price, deal.currency)}</strong>
          <span>{formatCurrency(deal.referencePrice, deal.currency)}</span>
          <mark>-{deal.discountPercent}%</mark>
        </div>

        <div className="confidence-meter" aria-label={`Score de confiance ${deal.confidenceScore}%`}>
          <span style={{ width: `${deal.confidenceScore}%` }} />
        </div>

        {deal.priceHistory.length > 0 && (
          <div className="sparkline" aria-label="Historique du prix estimé">
            {deal.priceHistory.map((snapshot) => (
              <span key={snapshot.date} title={`${snapshot.date}: ${formatCurrency(snapshot.price, deal.currency)}`}>
                <i style={{ height: `${Math.max(18, (snapshot.price / maxPrice) * 72)}px` }} />
                <small>{snapshot.date}</small>
              </span>
            ))}
          </div>
        )}

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
    scanError,
    lastUpdated,
    startLiveScan,
    toggleWatchlist,
    verifyDeal,
  } = useDealTracker();

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div className="hero-panel__copy">
          <p className="eyebrow">GlitchPrice Finder • vrai scrap 70%+</p>
          <h1>Scraper réel de grosses promos 70%+ et erreurs de prix.</h1>
          <p>
            Scrape Dealabs, Amazon Goldbox en direct et des flux marchands Amazon, Cdiscount, Fnac, filtre les remises profondes à 70% ou plus,
            normalise les prix et vérifie les liens sans données simulées.
          </p>
          <div className="hero-actions">
            <button type="button" onClick={startLiveScan} disabled={scanJob?.status === "running"}>
              {scanJob?.status === "running" ? "Scan live en cours..." : "Scraper les grosses promos"}
            </button>
            <span>
              {sources.length} scrapers publics actifs
              {lastUpdated ? ` • dernière sync ${formatRelativeTime(lastUpdated)}` : ""}
            </span>
          </div>
        </div>

        <aside className="scan-console" aria-label="Console de scan">
          <div className="scan-console__topline">
            <span>{scanJob?.status === "completed" ? "Scrap OK" : scanJob?.status === "running" ? "Scanning" : "Prêt"}</span>
            <strong>{scanJob?.progress ?? 0}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${scanJob?.progress ?? 0}%` }} />
          </div>
          <dl>
            <div>
              <dt>Sources scrapées</dt>
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
          <span>Économies estimées</span>
          <strong>{formatCurrency(metrics.potentialSavings)}</strong>
        </div>
      </section>

      <section className="workspace-grid">
        <aside className="source-panel">
          <div className="section-heading">
            <p className="eyebrow">Scrapers réels</p>
            <h2>Sources publiques</h2>
          </div>
          <div className="source-list">
            {sources.map((source) => (
              <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="source-card">
                <span>{source.name}</span>
                <small>{source.cadenceMinutes} min • fiabilité {source.reliability}% • live</small>
              </a>
            ))}
          </div>
        </aside>

        <section className="deal-panel">
          <div className="section-heading section-heading--inline">
            <div>
              <p className="eyebrow">Promos 70%+ et erreurs triées par score</p>
              <h2>Grosses promos détectées</h2>
              {scanError ? <p className="panel-warning">{scanError}</p> : null}
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
            {deals.length === 0 && scanJob?.status !== "running" ? (
              <div className="empty-state">
                <strong>Aucun deal live chargé pour le moment.</strong>
                <span>Lance un scan pour scraper les sources publiques et remplir le radar.</span>
              </div>
            ) : null}
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
