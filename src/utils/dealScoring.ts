import { DealSignal, TrackerMetrics } from "../types";

export function formatCurrency(value: number, currency: DealSignal["currency"] = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelativeTime(isoDate: string) {
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - new Date(isoDate).getTime()) / 60000));

  if (elapsedMinutes < 60) return `il y a ${elapsedMinutes} min`;

  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) return `il y a ${elapsedHours} h`;

  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(isoDate));
}

export function calculateConfidence(deal: Pick<DealSignal, "discountPercent" | "stock" | "verificationStatus">) {
  const stockBoost = deal.stock === "low" ? 8 : deal.stock === "medium" ? 4 : 0;
  const verificationBoost = deal.verificationStatus === "verified" ? 14 : deal.verificationStatus === "checking" ? 6 : 0;
  return Math.min(99, Math.round(deal.discountPercent * 1.35 + stockBoost + verificationBoost));
}

export function calculateMetrics(deals: DealSignal[]): TrackerMetrics {
  if (!deals.length) {
    return {
      averageDiscount: 0,
      highConfidenceDeals: 0,
      lowStockDeals: 0,
      potentialSavings: 0,
    };
  }

  return {
    averageDiscount: Math.round(deals.reduce((sum, deal) => sum + deal.discountPercent, 0) / deals.length),
    highConfidenceDeals: deals.filter((deal) => deal.confidenceScore >= 85).length,
    lowStockDeals: deals.filter((deal) => deal.stock === "low").length,
    potentialSavings: deals.reduce((sum, deal) => sum + Math.max(0, deal.referencePrice - deal.price), 0),
  };
}

export function sortDealsByOpportunity(deals: DealSignal[]) {
  return [...deals].sort((a, b) => {
    const scoreA = a.confidenceScore * 2 + a.discountPercent + (a.stock === "low" ? 20 : 0);
    const scoreB = b.confidenceScore * 2 + b.discountPercent + (b.stock === "low" ? 20 : 0);
    return scoreB - scoreA;
  });
}
