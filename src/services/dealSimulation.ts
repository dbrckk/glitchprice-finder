import { DealSignal, ScanJob } from "../types";
import { calculateConfidence } from "../utils/dealScoring";

export interface SimulatedScanTemplate {
  title: string;
  merchant: string;
  category: DealSignal["category"];
  sourceId: string;
  image: string;
  referencePrice: number;
  basePrice: number;
  tags: string[];
}

export interface ScanTickOutcome {
  progress: number;
  scannedSources: number;
  shouldAddDeal: boolean;
}

export const SIMULATED_SCAN_TEMPLATES: SimulatedScanTemplate[] = [
  {
    title: "Apple Watch Ultra 2 titane",
    merchant: "Amazon FR",
    category: "tech",
    sourceId: "amazon-fr-promos",
    image: "⌚",
    referencePrice: 899,
    basePrice: 499,
    tags: ["coupon-hidden", "low-stock"],
  },
  {
    title: "Canapé convertible scandinave 3 places",
    merchant: "Cdiscount",
    category: "home",
    sourceId: "cdiscount-bons-plans",
    image: "🛋️",
    referencePrice: 699,
    basePrice: 279,
    tags: ["destockage", "code-promo"],
  },
  {
    title: "Pack PlayStation 5 Slim + 2 manettes",
    merchant: "Dealabs signalement",
    category: "gaming",
    sourceId: "dealabs-hot",
    image: "🕹️",
    referencePrice: 619,
    basePrice: 389,
    tags: ["community-hot", "bundle"],
  },
  {
    title: "Sneakers premium cuir pleine fleur",
    merchant: "Zalando Privé",
    category: "fashion",
    sourceId: "zalando-prive",
    image: "👟",
    referencePrice: 220,
    basePrice: 74,
    tags: ["vente-privee", "size-alert"],
  },
  {
    title: "Vol Paris - Tokyo aller-retour printemps",
    merchant: "Google Flights signal",
    category: "travel",
    sourceId: "google-flights-watch",
    image: "✈️",
    referencePrice: 845,
    basePrice: 418,
    tags: ["fare-drop", "date-flexible"],
  },
];

export function createScanJob(now = new Date()): ScanJob {
  return {
    id: `scan-${now.getTime()}`,
    createdAt: now.toISOString(),
    status: "running",
    progress: 0,
    scannedSources: 0,
    detectedDeals: 0,
  };
}

export function getScanTickOutcome(tick: number, sourceCount: number): ScanTickOutcome {
  return {
    progress: Math.round(Math.min(100, tick * 16.7)),
    scannedSources: Math.min(sourceCount, tick),
    shouldAddDeal: tick === 2 || tick === 4 || tick === 5 || tick === 6,
  };
}

export function buildDetectedDeal(scanIndex: number, now = new Date()): DealSignal {
  const template = SIMULATED_SCAN_TEMPLATES[scanIndex % SIMULATED_SCAN_TEMPLATES.length];
  if (!template) throw new Error("Aucun template de scan disponible");

  const variance = (scanIndex % 4) * 19;
  const price = Math.max(29, template.basePrice - variance);
  const discountPercent = Math.round(((template.referencePrice - price) / template.referencePrice) * 100);
  const verificationStatus: DealSignal["verificationStatus"] = scanIndex % 2 === 0 ? "verified" : "tracked";
  const stock: DealSignal["stock"] = scanIndex % 3 === 0 ? "low" : scanIndex % 3 === 1 ? "medium" : "high";
  const detectedAt = now.toISOString();

  const draft = {
    discountPercent,
    stock,
    verificationStatus,
    priceHistory: [],
  };

  return {
    id: `${template.sourceId}-${now.getTime()}-${scanIndex}`,
    title: template.title,
    merchant: template.merchant,
    category: template.category,
    url: `https://example.com/free-scan/${template.sourceId}/${now.getTime()}`,
    image: template.image,
    price,
    referencePrice: template.referencePrice,
    currency: "EUR",
    discountPercent,
    confidenceScore: calculateConfidence(draft),
    detectedAt,
    stock,
    tags: ["auto-scan", ...template.tags],
    sourceId: template.sourceId,
    verificationStatus,
    priceHistory: [
      { date: "J-4", price: template.referencePrice },
      { date: "J-3", price: Math.round(template.referencePrice * 0.93) },
      { date: "J-2", price: Math.round(template.referencePrice * 0.82) },
      { date: "Hier", price: Math.round(template.referencePrice * 0.7) },
      { date: "Maintenant", price },
    ],
  };
}
