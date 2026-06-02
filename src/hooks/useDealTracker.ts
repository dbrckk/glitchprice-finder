import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LIVE_FEEDS, LiveScanResult, fetchLiveDeals, verifyDealAvailability } from "../api/liveDeals";
import { calculateConfidence, calculateMetrics, sortDealsByOpportunity } from "../utils/dealScoring";
import { DealCategory, DealSignal, ScanJob } from "../types";

const STORAGE_KEY = "glitchprice.liveDeals.v2";
const WATCHLIST_KEY = "glitchprice.watchlist.v2";

export interface SourceReport {
  sourceId: string;
  sourceName: string;
  status: "idle" | "ok" | "empty" | "error";
  detectedDeals: number;
  durationMs: number;
  fetchedAt: string | null;
  error?: string;
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function buildInitialReports(): SourceReport[] {
  return LIVE_FEEDS.map((source) => ({
    sourceId: source.id,
    sourceName: source.name,
    status: "idle",
    detectedDeals: 0,
    durationMs: 0,
    fetchedAt: null,
  }));
}

function buildReports(results: LiveScanResult[]): SourceReport[] {
  const reports = new Map(
    buildInitialReports().map((report) => [report.sourceId, report]),
  );

  for (const result of results) {
    reports.set(result.sourceId, {
      sourceId: result.sourceId,
      sourceName: result.sourceName,
      status: result.error ? "error" : result.deals.length > 0 ? "ok" : "empty",
      detectedDeals: result.deals.length,
      durationMs: result.durationMs,
      fetchedAt: result.fetchedAt,
      error: result.error,
    });
  }

  return Array.from(reports.values());
}

function mergeDeals(currentDeals: DealSignal[], incomingDeals: DealSignal[]) {
  const byId = new Map<string, DealSignal>();

  for (const deal of [...incomingDeals, ...currentDeals]) {
    const existing = byId.get(deal.id);
    byId.set(deal.id, existing ? { ...deal, verificationStatus: existing.verificationStatus } : deal);
  }

  return sortDealsByOpportunity(Array.from(byId.values())).slice(0, 60);
}

export function useDealTracker() {
  const [deals, setDeals] = useState<DealSignal[]>(() => safeRead(STORAGE_KEY, []));
  const [watchlist, setWatchlist] = useState<string[]>(() => safeRead(WATCHLIST_KEY, []));
  const [activeCategory, setActiveCategory] = useState<DealCategory>("all");
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string>("");
  const [sourceReports, setSourceReports] = useState<SourceReport[]>(() => buildInitialReports());
  const firstLoadRef = useRef(false);
  const scanRunRef = useRef(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  }, [deals]);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const filteredDeals = useMemo(() => {
    const scopedDeals = activeCategory === "all" ? deals : deals.filter((deal) => deal.category === activeCategory);
    return sortDealsByOpportunity(scopedDeals);
  }, [activeCategory, deals]);

  const metrics = useMemo(() => calculateMetrics(filteredDeals), [filteredDeals]);
  const sourceHealth = useMemo(() => {
    const okSources = sourceReports.filter((report) => report.status === "ok").length;
    const failedSources = sourceReports.filter((report) => report.status === "error").length;
    const emptySources = sourceReports.filter((report) => report.status === "empty").length;

    return { okSources, failedSources, emptySources };
  }, [sourceReports]);

  const startLiveScan = useCallback(async () => {
    const scanRunId = scanRunRef.current + 1;
    scanRunRef.current = scanRunId;

    const job: ScanJob = {
      id: `scan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "running",
      progress: 8,
      scannedSources: 0,
      detectedDeals: 0,
    };

    setScanJob(job);
    setScanError("");
    setSourceReports(buildInitialReports());

    const results = await fetchLiveDeals(LIVE_FEEDS);
    if (scanRunRef.current !== scanRunId) return;

    const liveDeals = results.flatMap((result) => result.deals);
    const failedSources = results.filter((result) => result.error);

    setSourceReports(buildReports(results));
    setDeals((currentDeals) => mergeDeals(currentDeals, liveDeals));
    setLastUpdated(new Date().toISOString());
    setScanJob((currentJob) => ({
      ...(currentJob ?? job),
      status: "completed",
      progress: 100,
      scannedSources: results.length,
      detectedDeals: liveDeals.length,
    }));

    if (failedSources.length) {
      setScanError(
        `${failedSources.length} source(s) indisponible(s): ${failedSources
          .map((result) => result.sourceId)
          .join(", ")}. Les derniers deals live restent affichés.`,
      );
    }
  }, []);

  useEffect(() => {
    if (firstLoadRef.current) return;
    firstLoadRef.current = true;
    void startLiveScan();
  }, [startLiveScan]);

  const toggleWatchlist = (dealId: string) => {
    setWatchlist((currentWatchlist) =>
      currentWatchlist.includes(dealId)
        ? currentWatchlist.filter((trackedId) => trackedId !== dealId)
        : [dealId, ...currentWatchlist],
    );
  };

  const verifyDeal = async (dealId: string) => {
    const targetDeal = deals.find((deal) => deal.id === dealId);
    if (!targetDeal) return;

    setDeals((currentDeals) =>
      currentDeals.map((deal) =>
        deal.id === dealId ? { ...deal, verificationStatus: "checking", confidenceScore: Math.max(deal.confidenceScore, 75) } : deal,
      ),
    );

    try {
      const isAvailable = await verifyDealAvailability(targetDeal.url);
      setDeals((currentDeals) =>
        currentDeals.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                verificationStatus: isAvailable ? "verified" : "expired",
                confidenceScore: isAvailable
                  ? calculateConfidence({ ...deal, verificationStatus: "verified" })
                  : Math.min(deal.confidenceScore, 35),
                detectedAt: new Date().toISOString(),
              }
            : deal,
        ),
      );
    } catch {
      setDeals((currentDeals) =>
        currentDeals.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                verificationStatus: "tracked",
                confidenceScore: Math.max(55, deal.confidenceScore - 10),
              }
            : deal,
        ),
      );
    }
  };

  return {
    sources: LIVE_FEEDS,
    deals: filteredDeals,
    allDeals: deals,
    metrics,
    activeCategory,
    scanJob,
    scanError,
    lastUpdated,
    watchlist,
    sourceReports,
    sourceHealth,
    setActiveCategory,
    startLiveScan,
    toggleWatchlist,
    verifyDeal,
  };
}
