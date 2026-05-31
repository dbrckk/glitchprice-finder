import { describe, expect, it, vi } from "vitest";
import { fetchLiveDealFeed, parseLiveScanPayload } from "../liveDealFeed";

describe("liveDealFeed", () => {
  const payload = {
    scannedAt: "2026-05-31T05:00:00.000Z",
    franceDeliveryRequired: true,
    minDiscountPercent: 35,
    maxResults: 10,
    results: [
      {
        sourceId: "dealabs-price-error-fr",
        sourceName: "Dealabs erreurs de prix",
        title: "Erreur de prix - Montre connectée livraison France",
        url: "https://www.dealabs.com/share-deal/123",
        price: 49,
        referencePrice: 199,
        discountPercent: 75,
        franceDelivery: true,
        qualityScore: 98,
        priority: "critical",
      },
      {
        sourceId: "external-us",
        sourceName: "US only",
        title: "Deal non France",
        url: "https://example.com/us",
        price: 10,
        referencePrice: 100,
        discountPercent: 90,
        franceDelivery: false,
      },
    ],
    sourceReports: [{ sourceId: "dealabs-price-error-fr", sourceName: "Dealabs", status: "ok", results: 1, durationMs: 20 }],
    errors: [],
  };

  it("normalizes only France-deliverable live scan results", () => {
    const feed = parseLiveScanPayload(payload);

    expect(feed.deals).toHaveLength(1);
    expect(feed.deals[0]).toMatchObject({
      merchant: "Dealabs erreurs de prix",
      price: 49,
      referencePrice: 199,
      discountPercent: 75,
      verificationStatus: "verified",
      stock: "low",
      detectedAt: "2026-05-31T05:00:00.000Z",
    });
    expect(feed.deals[0]?.tags).toContain("france-delivery");
  });

  it("returns an explicit error for invalid payloads", () => {
    expect(parseLiveScanPayload({}).errors).toEqual(["Flux live invalide."]);
  });

  it("fetches and parses a real feed endpoint contract", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));

    await expect(fetchLiveDealFeed("/live-deals.json", fetcher)).resolves.toMatchObject({ scannedAt: payload.scannedAt });
    expect(fetcher).toHaveBeenCalledWith("/live-deals.json", { cache: "no-store" });
  });
});
