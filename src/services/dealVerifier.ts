import { isGlitchApiConfigured, verifyItem, type VerifyItemResult } from "../api/glitchApi";
import { QUALITY_THRESHOLDS } from "../config/qualityThresholds";
import type { DealSignal } from "../types";
import { isDealFresh } from "../utils/dealFreshness";
import { assessFranceDelivery } from "../utils/franceDelivery";

function hasFranceDeliverySignal(deal: DealSignal) {
  const haystack = [deal.url, deal.merchant, deal.sourceId, ...deal.tags].join(" ");
  return assessFranceDelivery(haystack, deal.url).eligible;
}

function buildLocalReason(deal: DealSignal, hasFranceDelivery: boolean) {
  const fragments = [
    `Pré-vérification locale: ${deal.discountPercent}% de remise`,
    hasFranceDelivery ? "livraison France détectée" : "livraison France non confirmée",
    isDealFresh(deal) ? "signal encore frais" : "scan à revalider",
  ];

  return `${fragments.join(", ")}. API marchand nécessaire pour confirmer panier final.`;
}

export async function verifyDealSignal(deal: DealSignal): Promise<VerifyItemResult> {
  if (isGlitchApiConfigured()) {
    return verifyItem(deal.url);
  }

  const hasFranceDelivery = hasFranceDeliverySignal(deal);
  const hasValidPrice = deal.price > 0 && deal.referencePrice >= deal.price;
  const hasStrongDiscount = deal.discountPercent >= QUALITY_THRESHOLDS.minimumLiveDiscountPercent;
  const checkedAt = new Date().toISOString();

  if (!hasValidPrice || !hasStrongDiscount || !hasFranceDelivery) {
    return {
      status: "unavailable",
      reason: buildLocalReason(deal, hasFranceDelivery),
      checkedAt,
      finalPrice: deal.price,
      shippingFrance: hasFranceDelivery,
      source: "local-preflight",
    };
  }

  return {
    status: "needs_api",
    reason: buildLocalReason(deal, hasFranceDelivery),
    checkedAt,
    finalPrice: deal.price,
    shippingFrance: hasFranceDelivery,
    source: "local-preflight",
  };
}
