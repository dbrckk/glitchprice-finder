import { describe, expect, it } from "vitest";
import { DealSignal } from "../../types";
import { evaluateDealRisks } from "../riskRules";

const deal: DealSignal = {
  id: "deal-risk",
  title: "Console",
  merchant: "Marketplace",
  category: "gaming",
  url: "https://example.com",
  image: "GM",
  price: 99,
  referencePrice: 499,
  currency: "EUR",
  discountPercent: 80,
  confidenceScore: 72,
  detectedAt: "2026-05-30T10:00:00.000Z",
  stock: "low",
  tags: ["marketplace"],
  sourceId: "dealabs-hot-fr",
  verificationStatus: "tracked",
  priceHistory: [{ date: "Maintenant", price: 99 }],
};

describe("riskRules", () => {
  it("flags extreme unverified marketplace deals", () => {
    expect(evaluateDealRisks(deal).map((risk) => risk.id)).toEqual([
      "extreme-unverified-discount",
      "marketplace-seller",
      "low-stock",
    ]);
  });
});
