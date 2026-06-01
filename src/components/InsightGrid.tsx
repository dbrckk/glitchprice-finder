import { DealInsights } from "../utils/dealInsights";
import { formatCurrency, getOpportunityScore } from "../utils/dealScoring";

interface InsightGridProps {
  insights: DealInsights;
}

export function InsightGrid({ insights }: InsightGridProps) {
  return (
    <section className="insight-grid" aria-label="Pilotage intelligence deals">
      <article className="insight-card insight-card--primary">
        <p className="eyebrow">Action recommandée</p>
        <strong>{insights.recommendedAction}</strong>
        <span>{insights.criticalDeals} alertes critiques - {insights.urgentLowStockDeals} stocks bas actifs</span>
      </article>
      <article className="insight-card">
        <span>Meilleure opportunité</span>
        <strong>{insights.bestDeal ? insights.bestDeal.title : "Aucun deal actif"}</strong>
        <small>{insights.bestDeal ? `${insights.bestDeal.merchant} - score ${getOpportunityScore(insights.bestDeal)}` : "Lance un scan pour alimenter le cockpit."}</small>
      </article>
      <article className="insight-card">
        <span>Qualité portefeuille</span>
        <strong>{insights.averageConfidence}%</strong>
        <small>{insights.verificationRate}% vérifiés - {insights.watchlistCoverage}% en watchlist</small>
      </article>
      <article className="insight-card">
        <span>Marchand à prioriser</span>
        <strong>{insights.topMerchant ? insights.topMerchant.merchant : "-"}</strong>
        <small>{insights.topMerchant ? `${insights.topMerchant.dealCount} deals - ${formatCurrency(insights.topMerchant.potentialSavings)} d'économies` : "Aucune concentration détectée."}</small>
      </article>
    </section>
  );
}
