import { describe, expect, it } from "vitest";
import { extractDiscountPercent, parsePricePair } from "../priceParsing";

describe("priceParsing", () => {
  it("extracts French euro prices and reference price", () => {
    expect(parsePricePair("Laptop 499,99\u20ac au lieu de 1 299\u20ac livraison France")).toEqual({
      price: 499.99,
      referencePrice: 1299,
      currency: "EUR",
    });
  });

  it("extracts USD prices when euro prices are absent", () => {
    expect(parsePricePair("Bundle $49 instead of $129")).toEqual({ price: 49, referencePrice: 129, currency: "USD" });
  });

  it("extracts explicit discount percentages defensively", () => {
    expect(extractDiscountPercent("Erreur de prix -72% immédiat")).toBe(72);
    expect(extractDiscountPercent("Pas de remise")).toBeNull();
  });
});
