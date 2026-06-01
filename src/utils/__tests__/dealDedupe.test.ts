import { describe, expect, it } from "vitest";
import { dedupeDeals, getDealDedupeKey } from "../dealDedupe";

describe("dealDedupe", () => {
  it("normalizes URLs into stable dedupe keys", () => {
    expect(getDealDedupeKey({ merchant: "Amazon FR", url: "https://www.amazon.fr/deal?tag=abc", title: "Deal" })).toBe(
      "amazon-fr::amazon-fr-deal",
    );
  });

  it("keeps the highest confidence duplicate", () => {
    const deals = dedupeDeals([
      { merchant: "Fnac", url: "https://fnac.com/a", title: "A", confidenceScore: 70 },
      { merchant: "Fnac", url: "https://fnac.com/a?utm=1", title: "A copy", confidenceScore: 91 },
    ]);

    expect(deals).toHaveLength(1);
    expect(deals[0]?.confidenceScore).toBe(91);
  });
});
