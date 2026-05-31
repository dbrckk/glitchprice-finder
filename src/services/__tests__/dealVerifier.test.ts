import { describe, expect, it } from "vitest";
import type { DealSignal } from "../../types";
import { verifyDealSignal } from "../dealVerifier";

const baseDeal: DealSignal = {
  id: "deal-1",
  title: "SSD NVMe 2 To",
  merchant: "Dealabs Hot France",
  category: "tech",
  url: "https://www.dealabs.com/share-deal/123",
  image: "DL",
  price: 79,
  referencePrice: 199,
  currency: "EUR",
  discountPercent: 60,
  confidenceScore: 90,
  detectedAt: new Date().toISOString(),
  stock: "medium",
  tags: ["live-scan", "france-delivery", "critical"],
  sourceId: "dealabs-hot-fr",
  verificationStatus: "tracked",
  priceHistory: [
    { date: "Référence", price: 199 },
    { date: "Scan live", price: 79 },
  ],
};

describe("dealVerifier", () => {
  it("returns a needs_api preflight result when no backend API is configured", async () => {
    await expect(verifyDealSignal(baseDeal)).resolves.toMatchObject({
      status: "needs_api",
      finalPrice: 79,
      shippingFrance: true,
      source: "local-preflight",
    });
  });

  it("marks invalid local evidence unavailable without pretending checkout verification", async () => {
    await expect(verifyDealSignal({ ...baseDeal, tags: [], sourceId: "unknown", url: "https://example.com/deal" })).resolves.toMatchObject({
      status: "unavailable",
      shippingFrance: false,
      source: "local-preflight",
    });
  });
});
