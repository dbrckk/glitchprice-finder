import { describe, expect, it } from "vitest";
import { DealSignal } from "../../types";
import { calculateDiscountPercent, isDealSignal, sanitizeDeals, sanitizeWatchlist } from "../dealValidation";

const validDeal: DealSignal = {
  id: "deal-1",
  title: "MacBook Air M3",
  merchant: "Amazon FR",
  category: "tech",
  url: "https://example.com/deal-1",
  image: "PC",
  price: 799,
  referencePrice: 1299,
  currency: "EUR",
  discountPercent: 1,
  confidenceScore: 1,
  detectedAt: "2026-05-30T10:00:00.000Z",
  stock: "low",
  tags: ["price-error"],
  sourceId: "amazon-fr-promos",
  verificationStatus: "verified",
  verificationEvidence: {
    status: "needs_api",
    reason: "Pré-vérification locale en attente API.",
    checkedAt: "2026-05-30T10:05:00.000Z",
    finalPrice: 799,
    shippingFrance: true,
    source: "local-preflight",
  },
  priceHistory: [
    { date: "Hier", price: 999 },
    { date: "Maintenant", price: 799 },
  ],
};

describe("dealValidation", () => {
  it("validates deal-shaped values and rejects corrupted persisted payloads", () => {
    expect(isDealSignal(validDeal)).toBe(true);
    expect(isDealSignal({ ...validDeal, category: "invalid" })).toBe(false);
    expect(isDealSignal({ ...validDeal, detectedAt: "not-a-date" })).toBe(false);
    expect(isDealSignal({ ...validDeal, priceHistory: [] })).toBe(false);
    expect(isDealSignal({ ...validDeal, verificationEvidence: { status: "needs_api", checkedAt: "bad-date" } })).toBe(false);
  });

  it("sanitizes persisted deals and recalculates derived fields", () => {
    const sanitizedDeals = sanitizeDeals([validDeal, { ...validDeal, id: 7 }], []);

    expect(sanitizedDeals).toHaveLength(1);
    expect(sanitizedDeals[0]?.discountPercent).toBe(38);
    expect(sanitizedDeals[0]?.confidenceScore).toBeGreaterThan(validDeal.confidenceScore);
    expect(sanitizedDeals[0]?.verificationEvidence?.source).toBe("local-preflight");
  });

  it("deduplicates watchlist values and keeps only strings", () => {
    expect(sanitizeWatchlist(["deal-1", "deal-1", "", 42, "deal-2"])).toEqual(["deal-1", "deal-2"]);
    expect(sanitizeWatchlist({})).toEqual([]);
  });

  it("calculates discounts defensively", () => {
    expect(calculateDiscountPercent(50, 100)).toBe(50);
    expect(calculateDiscountPercent(100, 100)).toBe(0);
    expect(calculateDiscountPercent(100, 0)).toBe(0);
  });
});
