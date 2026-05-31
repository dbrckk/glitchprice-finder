import { QUALITY_THRESHOLDS } from "../config/qualityThresholds";
import { LiveDealSource } from "../data/sourceCatalog";
import { DealSignal } from "../types";
import { calculateConfidence } from "./dealScoring";
import { assessFranceDelivery } from "./franceDelivery";
import { extractDiscountPercent, parsePricePair } from "./priceParsing";

export interface RawLiveDealCandidate {
  title: string;
  url: string;
  snippet: string;
  merchant?: string;
  detectedAt?: string;
}

function stableIdFragment(value: string) {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function inferMerchant(candidate: RawLiveDealCandidate, source: LiveDealSource) {
  if (candidate.merchant) return candidate.merchant;

  try {
    return new URL(candidate.url).hostname.replace(/^www\./, "");
  } catch {
    return source.name;
  }
}

export function normalizeLiveCandidate(candidate: RawLiveDealCandidate, source: LiveDealSource): DealSignal | null {
  const text = `${candidate.title} ${candidate.snippet}`;
  const delivery = assessFranceDelivery(text, candidate.url);
  if (!delivery.eligible) return null;

  const pricePair = parsePricePair(text);
  if (!pricePair || pricePair.price <= 0) return null;

  const explicitDiscount = extractDiscountPercent(text);
  const referencePrice = pricePair.referencePrice ?? (explicitDiscount ? Math.round(pricePair.price / (1 - explicitDiscount / 100)) : pricePair.price);
  const discountPercent = explicitDiscount ?? Math.round(((referencePrice - pricePair.price) / Math.max(referencePrice, 1)) * 100);
  if (discountPercent < QUALITY_THRESHOLDS.minimumLiveDiscountPercent) return null;

  const stock: DealSignal["stock"] = /stock bas|dernier|expire|vite|limited|quantit/i.test(text) ? "low" : "medium";
  const verificationStatus: DealSignal["verificationStatus"] = source.reliability >= 85 ? "verified" : "tracked";
  const detectedAt = candidate.detectedAt ?? new Date().toISOString();
  const draft = { discountPercent, stock, verificationStatus, priceHistory: [{ date: "Maintenant", price: pricePair.price }] };

  return {
    id: `${source.id}-${stableIdFragment(candidate.url)}`,
    title: candidate.title.trim().slice(0, 140),
    merchant: inferMerchant(candidate, source),
    category: source.category,
    url: candidate.url,
    image: "DL",
    price: pricePair.price,
    referencePrice,
    currency: pricePair.currency,
    discountPercent,
    confidenceScore: Math.min(99, calculateConfidence(draft) + Math.round(delivery.score / 12)),
    detectedAt,
    stock,
    tags: ["live-source", "france-delivery", ...delivery.matchedMarkers.slice(0, 2)],
    sourceId: source.id,
    verificationStatus,
    priceHistory: [
      { date: "Référence", price: referencePrice },
      { date: "Maintenant", price: pricePair.price },
    ],
  };
}
