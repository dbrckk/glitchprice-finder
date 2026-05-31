import { memo } from "react";
import { DealSignal } from "../types";
import { CATEGORY_LABELS, formatCurrency, formatRelativeTime, getOpportunityScore, getSavings } from "../utils/dealScoring";
import { getFreshnessLabel } from "../utils/dealFreshness";
import { evaluateDealRisks } from "../utils/riskRules";

interface DealCardProps {
  deal: DealSignal;
  isTracked: boolean;
  onToggleWatchlist: (dealId: string) => void;
  onVerify: (dealId: string) => void;
}

function StockLabel({ stock }: { stock: DealSignal["stock"] }) {
  const label = stock === "low" ? "Stock bas" : stock === "medium" ? "Stock moyen" : "Stock OK";
  return <span className={`stock-pill stock-pill--${stock}`}>{label}</span>;
}

export const DealCard = memo(function DealCard({ deal, isTracked, onToggleWatchlist, onVerify }: DealCardProps) {
  const maxPrice = Math.max(...deal.priceHistory.map((snapshot) => snapshot.price), deal.referencePrice);
  const opportunityScore = getOpportunityScore(deal);
  const risks = evaluateDealRisks(deal);
  const freshnessLabel = getFreshnessLabel(deal);

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
            <span className="freshness-pill">{freshnessLabel}</span>
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

        {risks.length > 0 && (
          <div className="risk-row" aria-label="Signaux de risque">
            {risks.map((risk) => (
              <span key={risk.id} className={`risk-row__item risk-row__item--${risk.severity}`}>
                {risk.label}
              </span>
            ))}
          </div>
        )}

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
