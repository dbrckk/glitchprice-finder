import { QUALITY_THRESHOLDS } from "../config/qualityThresholds";
import { DealSignal } from "../types";

export function getDealAgeMinutes(deal: DealSignal, now = Date.now()) {
  return Math.max(0, Math.round((now - new Date(deal.detectedAt).getTime()) / 60_000));
}

export function isDealFresh(deal: DealSignal, maxAgeMinutes = QUALITY_THRESHOLDS.freshDealMaxAgeMinutes, now = Date.now()) {
  return deal.verificationStatus !== "expired" && getDealAgeMinutes(deal, now) <= maxAgeMinutes;
}

export function getFreshnessLabel(deal: DealSignal, now = Date.now()) {
  const age = getDealAgeMinutes(deal, now);
  if (age < 30) return "Ultra frais";
  if (age < 180) return "Actif récent";
  if (age < 720) return "À revalider";
  return "Probablement expiré";
}
