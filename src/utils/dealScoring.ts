import { QUALITY_THRESHOLDS } from "../config/qualityThresholds";
import { AlertRule, DealCategory, DealFilters, DealSignal, DealSortMode, TrackerMetrics } from "../types";

export const CATEGORY_LABELS: Record<DealCategory, string> = {
  all: "Tous",
  tech: "Tech",
  home: "Maison",
  gaming: "Gaming",
  fashion: "Mode",
  travel: "Voyage",
};

export const SORT_LABELS: Record<DealSortMode, string> = {
  opportunity: "Score opportunité",
  newest: "Plus récents",
  discount: "Remise max",
  savings: "Économies max",
  confidence: "Confiance max",
};

export function formatCurrency(value: number, currency: DealSignal["currency"] = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelativeTime(isoDate: string) {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));

  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;

  return `il y a ${Math.round(diffHours / 24)} j`;
}

export function getSavings(deal: DealSignal) {
  return Math.max(0, deal.referencePrice - deal.price);
}

export function calculateConfidence(signal: Partial<DealSignal>) {
  const discountScore = Math.min(42, (signal.discountPercent ?? 0) * 0.58);
  const verificationScore = signal.verificationStatus === "verified" ? 28 : signal.verificationStatus === "checking" ? 14 : 8;
  const stockScore = signal.stock === "low" ? 18 : signal.stock === "medium" ? 11 : 5;
  const historyScore = signal.priceHistory && signal.priceHistory.length >= 4 ? 12 : 8;

  return Math.min(99, Math.round(discountScore + verificationScore + stockScore + historyScore));
}

export function getOpportunityScore(deal: DealSignal) {
  const savingsRatio = getSavings(deal) / Math.max(deal.referencePrice, 1);
  const urgency = deal.stock === "low" ? 16 : deal.stock === "medium" ? 8 : 2;
  const verification = deal.verificationStatus === "verified" ? 12 : deal.verificationStatus === "checking" ? 4 : 0;

  return Math.round(deal.confidenceScore * 0.52 + deal.discountPercent * 0.55 + savingsRatio * 35 + urgency + verification);
}

export function sortDeals(deals: DealSignal[], sortMode: DealSortMode) {
  const sorted = [...deals];

  return sorted.sort((a, b) => {
    if (sortMode === "newest") return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    if (sortMode === "discount") return b.discountPercent - a.discountPercent;
    if (sortMode === "savings") return getSavings(b) - getSavings(a);
    if (sortMode === "confidence") return b.confidenceScore - a.confidenceScore;

    return getOpportunityScore(b) - getOpportunityScore(a);
  });
}

export function sortDealsByOpportunity(deals: DealSignal[]) {
  return sortDeals(deals, "opportunity");
}

export function dealMatchesFilters(deal: DealSignal, filters: DealFilters, watchlist: string[]) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const searchable = [deal.title, deal.merchant, deal.category, ...deal.tags].join(" ").toLowerCase();

  if (normalizedQuery && !searchable.includes(normalizedQuery)) return false;
  if (deal.discountPercent < filters.minDiscount) return false;
  if (filters.onlyVerified && deal.verificationStatus !== "verified") return false;
  if (filters.watchlistOnly && !watchlist.includes(deal.id)) return false;

  return true;
}

export function calculateCategoryCounts(deals: DealSignal[]): Record<DealCategory, number> {
  const counts: Record<DealCategory, number> = {
    all: deals.length,
    tech: 0,
    home: 0,
    gaming: 0,
    fashion: 0,
    travel: 0,
  };

  deals.forEach((deal) => {
    counts[deal.category] += 1;
  });

  return counts;
}

export function calculateMetrics(deals: DealSignal[], watchlist: string[] = []): TrackerMetrics {
  if (!deals.length) {
    return {
      averageDiscount: 0,
      highConfidenceDeals: 0,
      lowStockDeals: 0,
      potentialSavings: 0,
      trackedDeals: 0,
      verifiedDeals: 0,
    };
  }

  const totalDiscount = deals.reduce((sum, deal) => sum + deal.discountPercent, 0);

  return {
    averageDiscount: Math.round(totalDiscount / deals.length),
    highConfidenceDeals: deals.filter((deal) => deal.confidenceScore >= QUALITY_THRESHOLDS.highConfidenceScore).length,
    lowStockDeals: deals.filter((deal) => deal.stock === "low").length,
    potentialSavings: deals.reduce((sum, deal) => sum + getSavings(deal), 0),
    trackedDeals: deals.filter((deal) => watchlist.includes(deal.id)).length,
    verifiedDeals: deals.filter((deal) => deal.verificationStatus === "verified").length,
  };
}

export function buildAlerts(deals: DealSignal[], watchlist: string[]): AlertRule[] {
  const criticalDeal = deals.find((deal) => deal.discountPercent >= QUALITY_THRESHOLDS.probablePriceErrorDiscountPercent && deal.confidenceScore >= QUALITY_THRESHOLDS.highConfidenceScore);
  const trackedLowStock = deals.find((deal) => watchlist.includes(deal.id) && deal.stock === "low");
  const needsVerification = deals.find((deal) => deal.discountPercent >= 55 && deal.verificationStatus !== "verified");

  return [
    criticalDeal && {
      id: `critical-${criticalDeal.id}`,
      title: "Erreur de prix probable",
      description: `${criticalDeal.merchant} affiche ${criticalDeal.discountPercent}% de remise avec un score ${criticalDeal.confidenceScore}.`,
      severity: "critical" as const,
      dealId: criticalDeal.id,
    },
    trackedLowStock && {
      id: `stock-${trackedLowStock.id}`,
      title: "Watchlist en stock bas",
      description: `${trackedLowStock.title} est suivi et risque de disparaître rapidement.`,
      severity: "warning" as const,
      dealId: trackedLowStock.id,
    },
    needsVerification && {
      id: `verify-${needsVerification.id}`,
      title: "Vérification recommandée",
      description: `Re-scan conseillé avant achat pour ${needsVerification.title}.`,
      severity: "info" as const,
      dealId: needsVerification.id,
    },
  ].filter(Boolean) as AlertRule[];
}
