import { describe, expect, it } from "vitest";
import { assessFranceDelivery } from "../franceDelivery";

describe("franceDelivery", () => {
  it("accepts French merchants and explicit delivery markers", () => {
    const assessment = assessFranceDelivery("Livraison gratuite en France", "https://www.amazon.fr/deal");

    expect(assessment.eligible).toBe(true);
    expect(assessment.score).toBeGreaterThanOrEqual(35);
  });

  it("rejects offers that explicitly exclude France delivery", () => {
    expect(assessFranceDelivery("Huge deal, US only", "https://example.com").eligible).toBe(false);
  });

  it("keeps unknown international deals out of the active France pipeline", () => {
    expect(assessFranceDelivery("Hot deal", "https://example.com/deal").eligible).toBe(false);
  });
});
