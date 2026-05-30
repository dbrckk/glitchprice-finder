export interface ParsedPricePair {
  price: number;
  referencePrice?: number;
  currency: "EUR" | "USD";
}

const EURO_PRICE_PATTERN = /(?<!\d)(\d{1,4}(?:[\s.,]\d{3})*(?:[,.]\d{1,2})?)\s?(?:€|eur|euro)/gi;
const USD_PRICE_PATTERN = /(?:\$|usd)\s?(\d{1,4}(?:[\s.,]\d{3})*(?:[,.]\d{1,2})?)/gi;

function normalizePrice(rawPrice: string) {
  const compact = rawPrice.replace(/\s/g, "");
  const decimalNormalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact.replace(/,/g, "");
  const value = Number.parseFloat(decimalNormalized);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function extractPrices(text: string, pattern: RegExp) {
  return Array.from(text.matchAll(pattern))
    .map((match) => normalizePrice(match[1] ?? ""))
    .filter((price): price is number => price !== null && price > 0)
    .slice(0, 8);
}

export function parsePricePair(text: string): ParsedPricePair | null {
  const euroPrices = extractPrices(text, EURO_PRICE_PATTERN);
  if (euroPrices.length) {
    const sorted = [...new Set(euroPrices)].sort((a, b) => a - b);
    const pair: ParsedPricePair = { price: sorted[0] ?? euroPrices[0] ?? 0, currency: "EUR" };
    const referencePrice = sorted.at(-1);
    if (sorted.length > 1 && referencePrice !== undefined) pair.referencePrice = referencePrice;
    return pair;
  }

  const usdPrices = extractPrices(text, USD_PRICE_PATTERN);
  if (usdPrices.length) {
    const sorted = [...new Set(usdPrices)].sort((a, b) => a - b);
    const pair: ParsedPricePair = { price: sorted[0] ?? usdPrices[0] ?? 0, currency: "USD" };
    const referencePrice = sorted.at(-1);
    if (sorted.length > 1 && referencePrice !== undefined) pair.referencePrice = referencePrice;
    return pair;
  }

  return null;
}

export function extractDiscountPercent(text: string) {
  const match = text.match(/(?:-|−)?\s?(\d{2,3})\s?%/);
  if (!match?.[1]) return null;

  const discount = Number.parseInt(match[1], 10);
  return Number.isFinite(discount) ? Math.min(95, Math.max(0, discount)) : null;
}
