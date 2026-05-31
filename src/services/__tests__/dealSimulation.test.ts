import { describe, expect, it } from "vitest";
import { buildDetectedDeal, createScanJob, getScanTickOutcome } from "../dealSimulation";

describe("dealSimulation", () => {
  const now = new Date("2026-05-31T10:00:00.000Z");

  it("creates deterministic scan jobs for the UI simulator", () => {
    expect(createScanJob(now)).toEqual({
      id: "scan-1780221600000",
      createdAt: "2026-05-31T10:00:00.000Z",
      status: "running",
      progress: 0,
      scannedSources: 0,
      detectedDeals: 0,
    });
  });

  it("returns scan tick progress and detection cadence", () => {
    expect(getScanTickOutcome(1, 5)).toEqual({ progress: 17, scannedSources: 1, shouldAddDeal: false });
    expect(getScanTickOutcome(4, 5)).toEqual({ progress: 67, scannedSources: 4, shouldAddDeal: true });
    expect(getScanTickOutcome(9, 5)).toEqual({ progress: 100, scannedSources: 5, shouldAddDeal: false });
  });

  it("builds deterministic simulated deals with confidence and price history", () => {
    const deal = buildDetectedDeal(2, now);

    expect(deal).toMatchObject({
      id: "dealabs-hot-1780221600000-2",
      title: "Pack PlayStation 5 Slim + 2 manettes",
      merchant: "Dealabs signalement",
      discountPercent: 43,
      verificationStatus: "verified",
      stock: "high",
      detectedAt: "2026-05-31T10:00:00.000Z",
    });
    expect(deal.confidenceScore).toBeGreaterThan(60);
    expect(deal.priceHistory).toHaveLength(5);
  });
});
