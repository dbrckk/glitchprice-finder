import { describe, expect, it } from "vitest";
import { DealFilters, DealSignal } from "../../types";
import {
  buildAlerts,
  calculateCategoryCounts,
  calculateConfidence,
  calculateMetrics,
  dealMatchesFilters,
  formatCurrency,
  getOpportunityScore,
  getSavings,
  sortDeals,
} from "../dealScoring";

const baseDeal: DealSignal = {
  id: "deal-1",
  title: "Laptop premium erreur de prix",
  merchant: "Fnac",
  category: "tech",
  url: "https://example.com/deal-1",
  image: "💻",
  price: 499,
  referencePrice: 1299,
  currency: "EUR",
  discountPercent: 62,
  confidenceScore: 91,
  detectedAt: "2026-05-30T10:00:00.000Z",
  stock: "low",
  tags: ["price-error", "verified-cart"],
  sourceId: "fnac-flash",
  verificationStatus: "verified",
  priceHistory: [
    { date: "J-2", price: 1299 },
    { date: "Hier", price: 899 },
    { date: "Maintenant", price: 499 },
  ],
};

const secondDeal: DealSignal = {
  ...baseDeal,
  id: "deal-2",
  title: "Canapé convertible",
  merchant: "Cdiscount",
  category: "home",
  price: 319,
  referencePrice: 699,
  discountPercent: 54,
  confidenceScore: 78,
  detectedAt: "2026-05-30T11:00:00.000Z",
  stock: "medium",
  tags: ["coupon-stack"],
  verificationStatus: "tracked",
};

const defaultFilters: DealFilters = {
  query: "",
  minDiscount: 0,
  onlyVerified: false,
  watchlistOnly: false,
  sortMode: "opportunity",
};

describe("dealScoring", () => {
  it("formats prices and computes deterministic savings", () => {
    expect(formatCurrency(1299)).toBe("1 299 €");
    expect(getSavings(baseDeal)).toBe(800);
  });

  it("scores verified low-stock deals higher than tracked deals", () => {
    const verifiedScore = calculateConfidence(baseDeal);
    const trackedScore = calculateConfidence({ ...baseDeal, stock: "high", verificationStatus: "tracked" });

    expect(verifiedScore).toBeGreaterThan(trackedScore);
    expect(getOpportunityScore(baseDeal)).toBeGreaterThan(getOpportunityScore(secondDeal));
  });

  it("filters by query, discount, verification and watchlist", () => {
    expect(dealMatchesFilters(baseDeal, { ...defaultFilters, query: "fnac", minDiscount: 60 }, [])).toBe(true);
    expect(dealMatchesFilters(baseDeal, { ...defaultFilters, query: "dyson" }, [])).toBe(false);
    expect(dealMatchesFilters(secondDeal, { ...defaultFilters, onlyVerified: true }, [])).toBe(false);
    expect(dealMatchesFilters(baseDeal, { ...defaultFilters, watchlistOnly: true }, ["deal-1"])).toBe(true);
  });

  it("counts deals by category", () => {
    expect(calculateCategoryCounts([baseDeal, secondDeal])).toEqual({
      all: 2,
      tech: 1,
      home: 1,
      gaming: 0,
      fashion: 0,
      travel: 0,
    });
  });

  it("sorts and aggregates deals for dashboard metrics", () => {
    expect(sortDeals([secondDeal, baseDeal], "savings")[0]?.id).toBe("deal-1");
    expect(sortDeals([baseDeal, secondDeal], "newest")[0]?.id).toBe("deal-2");

    const metrics = calculateMetrics([baseDeal, secondDeal], ["deal-1"]);
    expect(metrics.averageDiscount).toBe(58);
    expect(metrics.highConfidenceDeals).toBe(1);
    expect(metrics.trackedDeals).toBe(1);
    expect(metrics.verifiedDeals).toBe(1);
  });

  it("generates actionable alert rules", () => {
    const alerts = buildAlerts([{ ...baseDeal, discountPercent: 68 }, secondDeal], ["deal-1"]);

    expect(alerts.map((alert) => alert.severity)).toEqual(["critical", "warning"]);
  });
});
