import { describe, expect, it } from "vitest";
import {
  buildCsv,
  cleanText,
  extractCandidates,
  extractEmbeddedDealabsCandidates,
  hasFranceDelivery,
  normalizePrice,
  parseScanArgs,
  rankAndDedupeCandidates,
  scoreCandidate,
} from "./live-scan-core.mjs";

const source = {
  id: "dealabs-hot-fr",
  name: "Dealabs Hot France",
  url: "https://www.dealabs.com/hot",
  reliability: 94,
};

describe("live scan core", () => {
  it("parses CLI options with safe defaults", () => {
    expect(parseScanArgs(["--min-discount=45", "--max-results=8", "--timeout-ms=1500", "--artifacts-dir=tmp/live"])).toMatchObject({
      minDiscountPercent: 45,
      maxResults: 8,
      requestTimeoutMs: 1500,
      artifactsDirectory: "tmp/live",
    });

    expect(parseScanArgs(["--min-discount=nope"]).minDiscountPercent).toBe(35);
  });

  it("normalizes euro prices and cleaned text", () => {
    expect(normalizePrice("1 299,90")).toBe(1299.9);
    expect(cleanText("<strong>Promo&nbsp;&amp;</strong> livraison")).toBe("Promo & livraison");
  });

  it("requires France delivery markers and rejects blocked shipping", () => {
    expect(hasFranceDelivery("Livraison gratuite en France", "https://shop.fr/deal")).toBe(true);
    expect(hasFranceDelivery("UK only", "https://shop.fr/deal")).toBe(false);
    expect(hasFranceDelivery("International shipping", "https://shop.example/deal")).toBe(false);
  });

  it("extracts embedded Dealabs candidates and ranks them by quality", () => {
    const html = `
      "threadId":"123","title":"SSD 4 To NVMe livraison France","linkHost":"amazon.fr","shareableLink":"https:\\/\\/www.dealabs.com\\/bons-plans\\/ssd","price":129.99,"nextBestPrice":319.99
      "threadId":"124","title":"Cable USB","linkHost":"amazon.fr","shareableLink":"https:\\/\\/www.dealabs.com\\/bons-plans\\/cable","price":8.99,"nextBestPrice":9.99
    `;

    const candidates = extractEmbeddedDealabsCandidates(html, source, { minDiscountPercent: 35, maxResults: 10, requestTimeoutMs: 1000, artifactsDirectory: "artifacts" });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ title: "SSD 4 To NVMe livraison France", discountPercent: 59, franceDelivery: true });
    expect(candidates[0].qualityScore).toBeGreaterThanOrEqual(90);
  });

  it("extracts anchor candidates when embedded data is unavailable", () => {
    const html = `<a href="/deal">PC portable livraison France <span>399\u20ac</span> au lieu de <span>999\u20ac</span></a>`;

    expect(extractCandidates(html, source, { minDiscountPercent: 35, maxResults: 10, requestTimeoutMs: 1000, artifactsDirectory: "artifacts" })).toEqual([
      expect.objectContaining({ price: 399, referencePrice: 999, discountPercent: 60, franceDelivery: true }),
    ]);
  });

  it("deduplicates candidates and keeps the best quality score", () => {
    const low = { title: "Deal", url: "https://shop.fr/item?utm=1", qualityScore: 50, discountPercent: 40 };
    const high = { title: "Deal", url: "https://shop.fr/item?utm=2", qualityScore: 91, discountPercent: 70 };

    expect(rankAndDedupeCandidates([low, high])).toEqual([high]);
  });

  it("builds a deterministic CSV export for live scan results", () => {
    const csv = buildCsv([
      {
        priority: "critical",
        qualityScore: 98,
        sourceName: "Dealabs",
        title: "TV 55\" OLED",
        url: "https://dealabs.com/tv",
        price: 499,
        referencePrice: 999,
        discountPercent: 50,
        franceDelivery: true,
      },
    ]);

    expect(csv).toContain("priority,qualityScore,source,title,url,price,referencePrice,discountPercent,franceDelivery");
    expect(csv).toContain('"TV 55"" OLED"');
  });

  it("scores critical France candidates above weak candidates", () => {
    const critical = scoreCandidate({ price: 99, referencePrice: 499, discountPercent: 80, franceDelivery: true }, source);
    const weak = scoreCandidate({ price: 99, referencePrice: 120, discountPercent: 18, franceDelivery: true }, source);

    expect(critical).toBeGreaterThan(weak);
    expect(critical).toBeGreaterThanOrEqual(90);
  });
});
