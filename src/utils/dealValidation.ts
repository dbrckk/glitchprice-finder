import { DealCategory, DealSignal, VerificationStatus } from "../types";
import { calculateConfidence } from "./dealScoring";

const DEAL_CATEGORIES = ["tech", "home", "travel", "fashion", "gaming"] as const satisfies ReadonlyArray<Exclude<DealCategory, "all">>;
const VERIFICATION_STATUSES = ["tracked", "checking", "verified", "expired"] as const satisfies ReadonlyArray<VerificationStatus>;
const STOCK_LEVELS = ["high", "medium", "low"] as const satisfies ReadonlyArray<DealSignal["stock"]>;
const CURRENCIES = ["EUR", "USD"] as const satisfies ReadonlyArray<DealSignal["currency"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPriceHistory(value: unknown): value is DealSignal["priceHistory"] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (snapshot) =>
        isRecord(snapshot) &&
        typeof snapshot.date === "string" &&
        typeof snapshot.price === "number" &&
        Number.isFinite(snapshot.price) &&
        snapshot.price >= 0,
    )
  );
}

function isOneOf<const T extends readonly string[]>(value: unknown, allowedValues: T): value is T[number] {
  return typeof value === "string" && allowedValues.includes(value);
}

export function calculateDiscountPercent(price: number, referencePrice: number) {
  if (referencePrice <= 0 || price >= referencePrice) return 0;
  return Math.round(((referencePrice - price) / referencePrice) * 100);
}

export function isDealSignal(value: unknown): value is DealSignal {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.merchant === "string" &&
    isOneOf(value.category, DEAL_CATEGORIES) &&
    typeof value.url === "string" &&
    typeof value.image === "string" &&
    typeof value.price === "number" &&
    Number.isFinite(value.price) &&
    typeof value.referencePrice === "number" &&
    Number.isFinite(value.referencePrice) &&
    isOneOf(value.currency, CURRENCIES) &&
    typeof value.discountPercent === "number" &&
    Number.isFinite(value.discountPercent) &&
    typeof value.confidenceScore === "number" &&
    Number.isFinite(value.confidenceScore) &&
    typeof value.detectedAt === "string" &&
    !Number.isNaN(Date.parse(value.detectedAt)) &&
    isOneOf(value.stock, STOCK_LEVELS) &&
    isStringArray(value.tags) &&
    typeof value.sourceId === "string" &&
    isOneOf(value.verificationStatus, VERIFICATION_STATUSES) &&
    isPriceHistory(value.priceHistory)
  );
}

export function normalizeDealSignal(deal: DealSignal): DealSignal {
  const price = Math.max(0, deal.price);
  const referencePrice = Math.max(price, deal.referencePrice);
  const discountPercent = calculateDiscountPercent(price, referencePrice);
  const normalizedDeal = {
    ...deal,
    price,
    referencePrice,
    discountPercent,
  };

  return {
    ...normalizedDeal,
    confidenceScore: calculateConfidence(normalizedDeal),
  };
}

export function sanitizeDeals(value: unknown, fallback: DealSignal[]) {
  if (!Array.isArray(value)) return fallback;

  const sanitizedDeals = value.filter(isDealSignal).map(normalizeDealSignal);
  return sanitizedDeals.length ? sanitizedDeals : fallback;
}

export function sanitizeWatchlist(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0)));
}
