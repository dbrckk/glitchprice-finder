import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FREE_SOURCES } from "../data/freeSources";
import { LIVE_DEAL_SOURCES } from "../data/sourceCatalog";
import { verifyDealSignal } from "../services/dealVerifier";
import {
  buildAlerts,
  calculateCategoryCounts,
  calculateConfidence,
  calculateMetrics,
  dealMatchesFilters,
  sortDeals,
} from "../utils/dealScoring";
import { DealCategory, DealFilters, DealSignal, LiveFeedStatus, LiveScanPolicy, ScanJob, ScannerEvent } from "../types";
import { dedupeDeals } from "../utils/dealDedupe";
import { sanitizeDeals, sanitizeWatchlist } from "../utils/dealValidation";
import { fetchLiveDealFeed } from "../services/liveDealFeed";
import { safeReadJson, safeWriteJson } from "../utils/storage";

const STORAGE_KEY = "glitchprice.trackedDeals.v2";
const LEGACY_STORAGE_KEY = "glitchprice.trackedDeals.v1";
const WATCHLIST_KEY = "glitchprice.watchlist.v1";
const MAX_DEALS = 36;
const MAX_EVENTS = 8;
const LIVE_FEED_PATH = `${import.meta.env.BASE_URL}live-deals.json`;

const LIVE_SCAN_POLICY: LiveScanPolicy = {
  franceDeliveryRequired: true,
  minimumDiscountPercent: 35,
  sourceCount: LIVE_DEAL_SOURCES.length,
  lastLocalScanArtifact: "public/live-deals.json",
};

const DEFAULT_FILTERS: DealFilters = {
  query: "",
  minDiscount: 35,
  onlyVerified: false,
  watchlistOnly: false,
  sortMode: "opportunity",
};

const EMPTY_LIVE_FEED_STATUS: LiveFeedStatus = {
  scannedAt: null,
  lastRefreshAt: null,
  sourceReports: 0,
  healthySources: 0,
  failedSources: 0,
  errors: [],
  sourceDetails: [],
};

function readInitialDeals() {
  const v2Deals = sanitizeDeals(safeReadJson<unknown>(STORAGE_KEY, null), []);
  if (v2Deals.length) return dedupeDeals(v2Deals);

  const legacyDeals = sanitizeDeals(safeReadJson<unknown>(LEGACY_STORAGE_KEY, null), []);
  return legacyDeals.length ? dedupeDeals(legacyDeals) : [];
}

function buildEvent(label: string, severity: ScannerEvent["severity"] = "info"): ScannerEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    label,
    severity,
  };
}

function createLiveLoadJob(): ScanJob {
  const now = new Date();
  return {
    id: `live-load-${now.getTime()}`,
    createdAt: now.toISOString(),
    status: "running",
    progress: 15,
    scannedSources: 0,
    detectedDeals: 0,
  };
}

export function useDealTracker() {
  const [deals, setDeals] = useState<DealSignal[]>(readInitialDeals);
  const [watchlist, setWatchlist] = useState<string[]>(() => sanitizeWatchlist(safeReadJson<unknown>(WATCHLIST_KEY, [])));
  const [activeCategory, setActiveCategory] = useState<DealCategory>("all");
  const [filters, setFilters] = useState<DealFilters>(DEFAULT_FILTERS);
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const [liveFeedStatus, setLiveFeedStatus] = useState<LiveFeedStatus>(EMPTY_LIVE_FEED_STATUS);
  const [scanEvents, setScanEvents] = useState<ScannerEvent[]>(() => [
    buildEvent("Pipeline réel prêt : charge le dernier artefact live France.", "success"),
  ]);
  const verificationTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    safeWriteJson(STORAGE_KEY, deals);
  }, [deals]);

  useEffect(() => {
    safeWriteJson(WATCHLIST_KEY, watchlist);
  }, [watchlist]);

  useEffect(() => {
    return () => {
      verificationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const pushEvent = useCallback((label: string, severity: ScannerEvent["severity"] = "info") => {
    setScanEvents((currentEvents) => [buildEvent(label, severity), ...currentEvents].slice(0, MAX_EVENTS));
  }, []);

  const refreshLiveDeals = useCallback(async () => {
    setScanJob(createLiveLoadJob());
    pushEvent("Chargement du dernier scan réel France depuis l'artefact public.", "info");

    try {
      const feed = await fetchLiveDealFeed(`${LIVE_FEED_PATH}?t=${Date.now()}`);
      const nextDeals = dedupeDeals(feed.deals).slice(0, MAX_DEALS);
      const healthySources = feed.sourceReports.filter((report) => report.status === "ok").length;
      const failedSources = feed.sourceReports.filter((report) => report.status === "error").length;
      setDeals(nextDeals);
      setLiveFeedStatus({
        scannedAt: feed.scannedAt,
        lastRefreshAt: new Date().toISOString(),
        sourceReports: feed.sourceReports.length,
        healthySources,
        failedSources,
        errors: feed.errors,
        sourceDetails: feed.sourceReports,
      });
      setScanJob((currentJob) => ({
        ...(currentJob ?? createLiveLoadJob()),
        status: "completed",
        progress: 100,
        scannedSources: feed.sourceReports.length || LIVE_DEAL_SOURCES.length,
        detectedDeals: nextDeals.length,
      }));
      pushEvent(`${nextDeals.length} vrais deals live chargés depuis le scan du ${new Date(feed.scannedAt).toLocaleString("fr-FR")}.`, "success");
      feed.errors.forEach((error) => pushEvent(error, "warning"));
    } catch (error) {
      setScanJob((currentJob) => ({
        ...(currentJob ?? createLiveLoadJob()),
        status: "completed",
        progress: 100,
        scannedSources: 0,
        detectedDeals: 0,
      }));
      const message = error instanceof Error ? error.message : "Impossible de charger le flux live.";
      setLiveFeedStatus((currentStatus) => ({
        ...currentStatus,
        lastRefreshAt: new Date().toISOString(),
        errors: [message, ...currentStatus.errors].slice(0, 4),
      }));
      pushEvent(message, "warning");
    }
  }, [pushEvent]);

  useEffect(() => {
    void refreshLiveDeals();
  }, [refreshLiveDeals]);

  const filteredDeals = useMemo(() => {
    const scopedDeals = activeCategory === "all" ? deals : deals.filter((deal) => deal.category === activeCategory);
    const filtered = scopedDeals.filter((deal) => dealMatchesFilters(deal, filters, watchlist));
    return sortDeals(filtered, filters.sortMode);
  }, [activeCategory, deals, filters, watchlist]);

  const metrics = useMemo(() => calculateMetrics(filteredDeals, watchlist), [filteredDeals, watchlist]);
  const categoryCounts = useMemo(() => calculateCategoryCounts(deals), [deals]);
  const alerts = useMemo(() => buildAlerts(deals, watchlist), [deals, watchlist]);

  const updateFilters = (partialFilters: Partial<DealFilters>) => {
    setFilters((currentFilters) => ({ ...currentFilters, ...partialFilters }));
  };

  const clearFilters = () => {
    setActiveCategory("all");
    setFilters(DEFAULT_FILTERS);
  };

  const clearLocalDeals = () => {
    setDeals([]);
    setWatchlist([]);
    setScanJob(null);
    setLiveFeedStatus(EMPTY_LIVE_FEED_STATUS);
    pushEvent("Cache local vidé. Recharge le dernier artefact live pour récupérer des deals réels.", "warning");
  };

  const toggleWatchlist = (dealId: string) => {
    const isTracked = watchlist.includes(dealId);
    pushEvent(isTracked ? "Deal retiré de la watchlist." : "Deal ajouté à la watchlist prioritaire.", isTracked ? "info" : "success");
    setWatchlist((currentWatchlist) =>
      currentWatchlist.includes(dealId)
        ? currentWatchlist.filter((trackedId) => trackedId !== dealId)
        : [dealId, ...currentWatchlist],
    );
  };

  const verifyDeal = async (dealId: string) => {
    const dealToVerify = deals.find((deal) => deal.id === dealId);
    if (!dealToVerify) return;

    setDeals((currentDeals) =>
      currentDeals.map((deal) =>
        deal.id === dealId
          ? { ...deal, verificationStatus: "checking", confidenceScore: Math.max(deal.confidenceScore, 75) }
          : deal,
      ),
    );
    pushEvent("Vérification lancée: API si configurée, pré-check local sinon.", "info");

    try {
      const result = await verifyDealSignal(dealToVerify);
      const verificationEvidence = {
        status: result.status,
        reason: result.reason,
        checkedAt: result.checkedAt ?? new Date().toISOString(),
        ...(result.finalPrice !== undefined ? { finalPrice: result.finalPrice } : {}),
        ...(result.shippingFrance !== undefined ? { shippingFrance: result.shippingFrance } : {}),
        ...(result.source ? { source: result.source } : {}),
      };
      setDeals((currentDeals) =>
        currentDeals.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                verificationStatus: result.status === "verified" ? "verified" : result.status === "needs_api" ? "tracked" : "expired",
                verificationEvidence,
                confidenceScore:
                  result.status === "verified"
                    ? calculateConfidence({ ...deal, verificationStatus: "verified" })
                    : result.status === "needs_api"
                      ? Math.max(deal.confidenceScore, 76)
                      : Math.min(deal.confidenceScore, 55),
                detectedAt: result.status === "verified" ? new Date().toISOString() : deal.detectedAt,
              }
            : deal,
        ),
      );
      pushEvent(result.reason, result.status === "verified" ? "success" : result.status === "needs_api" ? "info" : "warning");
    } catch (error) {
      setDeals((currentDeals) =>
        currentDeals.map((deal) =>
          deal.id === dealId
            ? { ...deal, verificationStatus: "tracked", confidenceScore: Math.min(deal.confidenceScore, 74) }
            : deal,
        ),
      );
      pushEvent(error instanceof Error ? error.message : "Vérification réelle indisponible.", "warning");
    }
  };

  return {
    sources: FREE_SOURCES,
    liveScanPolicy: LIVE_SCAN_POLICY,
    deals: filteredDeals,
    allDeals: deals,
    metrics,
    categoryCounts,
    alerts,
    activeCategory,
    filters,
    scanJob,
    scanEvents,
    liveFeedStatus,
    watchlist,
    setActiveCategory,
    updateFilters,
    clearFilters,
    resetDemoData: clearLocalDeals,
    startFreeScan: refreshLiveDeals,
    toggleWatchlist,
    verifyDeal,
  };
}
