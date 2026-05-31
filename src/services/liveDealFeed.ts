import { DealSignal } from "../types";
import { calculateConfidence } from "../utils/dealScoring";

export interface LiveScanResultItem {
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  price: number;
  referencePrice?: number;
  discountPercent?: number;
  franceDelivery: boolean;
  qualityScore?: number;
  priority?: "critical" | "high" | "watch";
}

export interface LiveScanSourceReport {
  sourceId: string;
  sourceName: string;
  status: "ok" | "error";
  results: number;
  durationMs: number;
  error?: string;
}

export interface LiveScanPayload {
  scannedAt: string;
  franceDeliveryRequired: true;
  minDiscountPercent: number;
  maxResults: number;
  summary?: {
    totalResults: number;
    criticalCount: number;
    averageDiscount: number;
    healthySources: number;
    failedSources: number;
  };
  results: LiveScanResultItem[];
  sourceReports?: LiveScanSourceReport[];
  errors?: string[];
}

export interface ImportedLiveDealFeed {
  scannedAt: string;
  deals: DealSignal[];
  sourceReports: LiveScanSourceReport[];
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableIdFragment(value: string) {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

function inferCategory(item: Pick<LiveScanResultItem, "sourceId" | "title">): DealSignal["category"] {
  const haystack = `${item.sourceId} ${item.title}`.toLowerCase();
  if (/switch|playstation|xbox|nintendo|jeu|gaming/.test(haystack)) return "gaming";
  if (/canap|maison|aspirateur|climatiseur|fumoir|savon|linge/.test(haystack)) return "home";
  if (/montre|gants|claquettes|sneaker|venum|tissot/.test(haystack)) return "fashion";
  if (/vol|hotel|voyage|train/.test(haystack)) return "travel";
  return "tech";
}

function inferImage(category: DealSignal["category"]) {
  return category === "gaming" ? "GM" : category === "home" ? "HM" : category === "fashion" ? "FS" : category === "travel" ? "TR" : "DL";
}

function normalizeLiveScanItem(item: LiveScanResultItem, scannedAt: string): DealSignal | null {
  if (!item.franceDelivery || !Number.isFinite(item.price) || item.price <= 0) return null;

  const referencePrice = item.referencePrice && item.referencePrice > item.price ? item.referencePrice : item.price;
  const discountPercent = item.discountPercent ?? Math.round(((referencePrice - item.price) / Math.max(referencePrice, 1)) * 100);
  const category = inferCategory(item);
  const stock: DealSignal["stock"] = item.priority === "critical" ? "low" : item.priority === "high" ? "medium" : "high";
  const verificationStatus: DealSignal["verificationStatus"] = (item.qualityScore ?? 0) >= 85 ? "verified" : "tracked";
  const confidenceScore = Math.min(99, Math.max(item.qualityScore ?? 0, calculateConfidence({ discountPercent, stock, verificationStatus, priceHistory: [] })));

  return {
    id: `${item.sourceId}-${stableIdFragment(item.url)}`,
    title: item.title.trim().slice(0, 160),
    merchant: item.sourceName,
    category,
    url: item.url,
    image: inferImage(category),
    price: item.price,
    referencePrice,
    currency: "EUR",
    discountPercent,
    confidenceScore,
    detectedAt: scannedAt,
    stock,
    tags: ["live-scan", "france-delivery", item.priority ?? "watch", item.sourceId],
    sourceId: item.sourceId,
    verificationStatus,
    priceHistory: [
      { date: "Référence", price: referencePrice },
      { date: "Scan live", price: item.price },
    ],
  };
}

export function parseLiveScanPayload(value: unknown): ImportedLiveDealFeed {
  if (!isRecord(value) || typeof value.scannedAt !== "string" || !Array.isArray(value.results)) {
    return { scannedAt: new Date(0).toISOString(), deals: [], sourceReports: [], errors: ["Flux live invalide."] };
  }

  const sourceReports = Array.isArray(value.sourceReports) ? value.sourceReports.filter(isRecord) as unknown as LiveScanSourceReport[] : [];
  const errors = Array.isArray(value.errors) ? value.errors.filter((error): error is string => typeof error === "string") : [];
  const deals = value.results
    .filter(isRecord)
    .map((item) => normalizeLiveScanItem(item as unknown as LiveScanResultItem, value.scannedAt as string))
    .filter((deal): deal is DealSignal => deal !== null);

  return { scannedAt: value.scannedAt, deals, sourceReports, errors };
}

export async function fetchLiveDealFeed(feedUrl: string, fetcher: typeof fetch = fetch): Promise<ImportedLiveDealFeed> {
  const response = await fetcher(feedUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Flux live indisponible (${response.status})`);
  return parseLiveScanPayload(await response.json());
}
