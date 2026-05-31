import { FRANCE_DELIVERY_MARKERS } from "../data/sourceCatalog";

const BLOCKED_MARKERS = ["us only", "usa only", "uk only", "livraison impossible", "no shipping to france"];

export interface FranceDeliveryAssessment {
  eligible: boolean;
  score: number;
  matchedMarkers: string[];
  reason: string;
}

export function assessFranceDelivery(text: string, url: string): FranceDeliveryAssessment {
  const haystack = `${text} ${url}`.toLowerCase();
  const blocked = BLOCKED_MARKERS.find((marker) => haystack.includes(marker));
  if (blocked) {
    return { eligible: false, score: 0, matchedMarkers: [blocked], reason: "Mention incompatible avec une livraison France." };
  }

  const matchedMarkers = FRANCE_DELIVERY_MARKERS.filter((marker) => haystack.includes(marker));
  const score = Math.min(100, matchedMarkers.length * 24 + (url.includes(".fr") ? 28 : 0));

  return {
    eligible: score >= 35,
    score,
    matchedMarkers,
    reason: score >= 35 ? "Source ou marchand compatible avec livraison France." : "Livraison France non prouvée.",
  };
}
