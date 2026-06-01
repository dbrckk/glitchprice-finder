import { describe, expect, it } from "vitest";
import { DealSignal } from "../../types";
import { buildDealsCsv, buildExportFilename } from "../dealExport";

const deal: DealSignal = {
  id: "deal-1",
  title: "TV OLED 55\", modèle premium",
  merchant: "Amazon FR",
  category: "tech",
  url: "https://example.com/deal",
  image: "TV",
  price: 599,
  referencePrice: 1299,
  currency: "EUR",
  discountPercent: 54,
  confidenceScore: 89,
  detectedAt: "2026-05-30T10:00:00.000Z",
  stock: "low",
  tags: ["price-error", "coupon-stack"],
  sourceId: "amazon-fr-promos",
  verificationStatus: "verified",
  priceHistory: [
    { date: "Hier", price: 899 },
    { date: "Maintenant", price: 599 },
  ],
};

describe("dealExport", () => {
  it("builds escaped CSV rows with computed savings and opportunity score", () => {
    const csv = buildDealsCsv([deal]);
    const lines = csv.split("\n");

    expect(lines[0]).toContain("opportunityScore");
    expect(lines[1]).toContain('"TV OLED 55"", modèle premium"');
    expect(lines[1]).toContain(",700,");
    expect(lines[1]).toContain("price-error|coupon-stack");
  });

  it("creates a deterministic export filename", () => {
    expect(buildExportFilename(new Date("2026-05-30T12:00:00.000Z"))).toBe("glitchprice-deals-2026-05-30.csv");
  });
});
