import { describe, expect, it } from "vitest";
import { DealSignal } from "../../types";
import { buildDealInsights } from "../dealInsights";

const baseDeal: DealSignal = {
  id: "deal-1",
  title: "Console premium",
  merchant: "Merchant A",
  category: "gaming",
  url: "https://merchant-a.fr/deal",
  image: "GM",
  price: 199,
  referencePrice: 499,
  currency: "EUR",
  discountPercent: 60,
  confidenceScore: 90,
  detectedAt: new Date().toISOString(),
  stock: "medium",
  tags: ["live-source"],
  sourceId: "dealabs-hot-fr",
  verificationStatus: "verified",
  priceHistory: [{ date: "Maintenant", price: 199 }],
};

describe("buildDealInsights", () => {
  it("returns safe defaults when no deal is available", () => {
    expect(buildDealInsights([], [])).toEqual({
      bestDeal: null,
      criticalDeals: 0,
      urgentLowStockDeals: 0,
      averageConfidence: 0,
      verificationRate: 0,
      watchlistCoverage: 0,
      topMerchant: null,
      recommendedAction: "Lance un scan live ou restaure les données pour alimenter le cockpit.",
    });
  });

  it("computes portfolio quality, top merchant and best opportunity", () => {
    const strongerDeal: DealSignal = {
      ...baseDeal,
      id: "deal-2",
      title: "Erreur de prix TV",
      merchant: "Merchant B",
      price: 99,
      referencePrice: 799,
      discountPercent: 88,
      confidenceScore: 96,
      stock: "low",
      verificationStatus: "tracked",
    };

    const insights = buildDealInsights([baseDeal, strongerDeal], [strongerDeal.id]);

    expect(insights.bestDeal?.id).toBe(strongerDeal.id);
    expect(insights.criticalDeals).toBe(1);
    expect(insights.urgentLowStockDeals).toBe(1);
    expect(insights.averageConfidence).toBe(93);
    expect(insights.verificationRate).toBe(50);
    expect(insights.watchlistCoverage).toBe(50);
    expect(insights.topMerchant).toEqual({ merchant: "Merchant B", dealCount: 1, potentialSavings: 700 });
    expect(insights.recommendedAction).toMatch(/Priorité/);
  });
});
