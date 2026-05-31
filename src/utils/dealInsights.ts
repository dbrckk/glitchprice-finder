import { DealSignal } from "../types";
import { getOpportunityScore, getSavings } from "./dealScoring";
import { evaluateDealRisks } from "./riskRules";

export interface MerchantInsight {
  merchant: string;
  dealCount: number;
  potentialSavings: number;
}

export interface DealInsights {
  bestDeal: DealSignal | null;
  criticalDeals: number;
  urgentLowStockDeals: number;
  averageConfidence: number;
  verificationRate: number;
  watchlistCoverage: number;
  topMerchant: MerchantInsight | null;
  recommendedAction: string;
}

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function getTopMerchant(deals: DealSignal[]): MerchantInsight | null {
  if (!deals.length) return null;

  const merchants = deals.reduce((accumulator, deal) => {
    const current = accumulator.get(deal.merchant) ?? { merchant: deal.merchant, dealCount: 0, potentialSavings: 0 };
    current.dealCount += 1;
    current.potentialSavings += getSavings(deal);
    accumulator.set(deal.merchant, current);
    return accumulator;
  }, new Map<string, MerchantInsight>());

  return [...merchants.values()].sort((a, b) => b.potentialSavings - a.potentialSavings || b.dealCount - a.dealCount)[0] ?? null;
}

function buildRecommendedAction(insights: Omit<DealInsights, "recommendedAction">) {
  if (!insights.bestDeal) return "Lance un scan live ou restaure les données pour alimenter le cockpit.";
  if (insights.criticalDeals > 0) return "Priorité : ouvrir les erreurs probables et confirmer le prix final TTC + livraison France.";
  if (insights.urgentLowStockDeals > 0) return "Surveiller les stocks bas : ajoute les meilleurs deals à la watchlist avant expiration.";
  if (insights.verificationRate < 55) return "Renforcer la vérification : relance les checks marchands avant export ou partage.";
  if (insights.watchlistCoverage < 25) return "Sélectionner les meilleures opportunités dans la watchlist pour ne pas perdre les drops.";
  return "Pipeline sain : maintenir le scan live et exporter les opportunités visibles.";
}

export function buildDealInsights(deals: DealSignal[], watchlist: string[]): DealInsights {
  const bestDeal = deals.length ? [...deals].sort((a, b) => getOpportunityScore(b) - getOpportunityScore(a))[0] ?? null : null;
  const criticalDeals = deals.filter((deal) => deal.discountPercent >= 65 && deal.confidenceScore >= 85).length;
  const urgentLowStockDeals = deals.filter((deal) => deal.stock === "low" && deal.verificationStatus !== "expired").length;
  const averageConfidence = deals.length ? Math.round(deals.reduce((sum, deal) => sum + deal.confidenceScore, 0) / deals.length) : 0;
  const verificationRate = percent(deals.filter((deal) => deal.verificationStatus === "verified").length, deals.length);
  const watchlistCoverage = percent(deals.filter((deal) => watchlist.includes(deal.id)).length, deals.length);
  const topMerchant = getTopMerchant(deals);
  const riskWeightedDeals = deals.filter((deal) => evaluateDealRisks(deal).some((risk) => risk.severity !== "low")).length;

  const insightDraft = {
    bestDeal,
    criticalDeals: Math.max(criticalDeals, riskWeightedDeals),
    urgentLowStockDeals,
    averageConfidence,
    verificationRate,
    watchlistCoverage,
    topMerchant,
  };

  return {
    ...insightDraft,
    recommendedAction: buildRecommendedAction(insightDraft),
  };
}
