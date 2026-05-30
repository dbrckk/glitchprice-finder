export type DealCategory = "tech" | "home" | "travel" | "fashion" | "gaming" | "all";

export type VerificationStatus = "tracked" | "checking" | "verified" | "expired";

export interface DealSource {
  id: string;
  name: string;
  url: string;
  category: Exclude<DealCategory, "all">;
  cadenceMinutes: number;
  reliability: number;
}

export interface PriceSnapshot {
  date: string;
  price: number;
}

export interface DealSignal {
  id: string;
  title: string;
  merchant: string;
  category: Exclude<DealCategory, "all">;
  url: string;
  image: string;
  price: number;
  referencePrice: number;
  currency: "EUR" | "USD";
  discountPercent: number;
  confidenceScore: number;
  detectedAt: string;
  stock: "high" | "medium" | "low";
  tags: string[];
  sourceId: string;
  verificationStatus: VerificationStatus;
  priceHistory: PriceSnapshot[];
}

export interface ScanJob {
  id: string;
  createdAt: string;
  status: "queued" | "running" | "completed";
  progress: number;
  scannedSources: number;
  detectedDeals: number;
}

export interface TrackerMetrics {
  averageDiscount: number;
  highConfidenceDeals: number;
  lowStockDeals: number;
  potentialSavings: number;
}
