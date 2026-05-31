import { describe, expect, it } from "vitest";
import { DealSignal } from "../../types";
import { getDealAgeMinutes, getFreshnessLabel, isDealFresh } from "../dealFreshness";

const deal: DealSignal = {
  id: "fresh",
  title: "Deal",
  merchant: "Fnac",
  category: "tech",
  url: "https://example.com",
  image: "🔥",
  price: 100,
  referencePrice: 200,
  currency: "EUR",
  discountPercent: 50,
  confidenceScore: 90,
  detectedAt: "2026-05-30T10:00:00.000Z",
  stock: "medium",
  tags: [],
  sourceId: "fnac",
  verificationStatus: "verified",
  priceHistory: [{ date: "Maintenant", price: 100 }],
};

describe("dealFreshness", () => {
  it("computes active freshness windows", () => {
    const now = new Date("2026-05-30T11:00:00.000Z").getTime();
    expect(getDealAgeMinutes(deal, now)).toBe(60);
    expect(isDealFresh(deal, 180, now)).toBe(true);
    expect(getFreshnessLabel(deal, now)).toBe("Actif récent");
  });
});
