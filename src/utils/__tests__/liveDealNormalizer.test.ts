import { describe, expect, it } from "vitest";
import { LIVE_DEAL_SOURCES } from "../../data/sourceCatalog";
import { normalizeLiveCandidate } from "../liveDealNormalizer";

const source = LIVE_DEAL_SOURCES[0]!;

describe("liveDealNormalizer", () => {
  it("normalizes France-deliverable high-discount live candidates", () => {
    const deal = normalizeLiveCandidate(
      {
        title: "SSD NVMe 2 To 89\u20ac au lieu de 219\u20ac livraison France",
        snippet: "Grosse promo Amazon.fr, stock bas",
        url: "https://www.amazon.fr/deal/ssd",
      },
      source,
    );

    expect(deal?.discountPercent).toBeGreaterThanOrEqual(35);
    expect(deal?.tags).toContain("france-delivery");
    expect(deal?.verificationStatus).toBe("verified");
  });

  it("rejects candidates without proof of France delivery", () => {
    expect(
      normalizeLiveCandidate({ title: "Laptop 499\u20ac au lieu de 1299\u20ac", snippet: "US only", url: "https://example.com" }, source),
    ).toBeNull();
  });
});
