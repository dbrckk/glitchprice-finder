export type DealCategory = "tech" | "home" | "travel" | "fashion" | "gaming" | "all";

export type VerificationStatus = "tracked" | "checking" | "verified" | "expired";

export type DealSortMode = "opportunity" | "newest" | "discount" | "savings" | "confidence";

export interface DealFilters {
  query: string;
  minDiscount: number;
  onlyVerified: boolean;
  watchlistOnly: boolean;
  sortMode: DealSortMode;
}

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

export interface ScannerEvent {
  id: string;
  timestamp: string;
  label: string;
  severity: "info" | "success" | "warning";
}

export interface AlertRule {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  dealId?: string;
}

export interface LiveScanPolicy {
  franceDeliveryRequired: true;
  minimumDiscountPercent: number;
  sourceCount: number;
  lastLocalScanArtifact: string;
}

export interface LiveFeedStatus {
  scannedAt: string | null;
  lastRefreshAt: string | null;
  sourceReports: number;
  healthySources: number;
  failedSources: number;
  errors: string[];
}

export interface TrackerMetrics {
  averageDiscount: number;
  highConfidenceDeals: number;
  lowStockDeals: number;
  potentialSavings: number;
  trackedDeals: number;
  verifiedDeals: number;
}
