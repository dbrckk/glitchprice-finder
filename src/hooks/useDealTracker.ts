import { useEffect, useMemo, useRef, useState } from "react";
import { FREE_SOURCES, INITIAL_DEALS } from "../data/mockDeals";
import { buildDetectedDeal, createScanJob, getScanTickOutcome } from "../services/dealSimulation";
import { LIVE_DEAL_SOURCES } from "../data/sourceCatalog";
import {
  buildAlerts,
  calculateCategoryCounts,
  calculateConfidence,
  calculateMetrics,
  dealMatchesFilters,
  sortDeals,
} from "../utils/dealScoring";
import { DealCategory, DealFilters, DealSignal, LiveScanPolicy, ScanJob, ScannerEvent } from "../types";
import { dedupeDeals } from "../utils/dealDedupe";
import { sanitizeDeals, sanitizeWatchlist } from "../utils/dealValidation";
import { safeReadJson, safeWriteJson } from "../utils/storage";

const STORAGE_KEY = "glitchprice.trackedDeals.v2";
const LEGACY_STORAGE_KEY = "glitchprice.trackedDeals.v1";
const WATCHLIST_KEY = "glitchprice.watchlist.v1";
const MAX_DEALS = 24;
const MAX_EVENTS = 8;

const LIVE_SCAN_POLICY: LiveScanPolicy = {
  franceDeliveryRequired: true,
  minimumDiscountPercent: 35,
  sourceCount: LIVE_DEAL_SOURCES.length,
  lastLocalScanArtifact: "artifacts/live-deals.json",
};

const DEFAULT_FILTERS: DealFilters = {
  query: "",
  minDiscount: 35,
  onlyVerified: false,
  watchlistOnly: false,
  sortMode: "opportunity",
};

function readInitialDeals() {
  const v2Deals = sanitizeDeals(safeReadJson<unknown>(STORAGE_KEY, null), []);
  if (v2Deals.length) return dedupeDeals(v2Deals);

  const legacyDeals = sanitizeDeals(safeReadJson<unknown>(LEGACY_STORAGE_KEY, null), []);
  return legacyDeals.length ? dedupeDeals(legacyDeals) : INITIAL_DEALS;
}

function buildEvent(label: string, severity: ScannerEvent["severity"] = "info"): ScannerEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    label,
    severity,
  };
}

export function useDealTracker() {
  const [deals, setDeals] = useState<DealSignal[]>(readInitialDeals);
  const [watchlist, setWatchlist] = useState<string[]>(() => sanitizeWatchlist(safeReadJson<unknown>(WATCHLIST_KEY, [])));
  const [activeCategory, setActiveCategory] = useState<DealCategory>("all");
  const [filters, setFilters] = useState<DealFilters>(DEFAULT_FILTERS);
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const [scanEvents, setScanEvents] = useState<ScannerEvent[]>(() => [
    buildEvent("Pipeline local prêt : sources publiques + mocks premium chargés.", "success"),
  ]);
  const intervalRef = useRef<number | null>(null);
  const verificationTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    safeWriteJson(STORAGE_KEY, deals);
  }, [deals]);

  useEffect(() => {
    safeWriteJson(WATCHLIST_KEY, watchlist);
  }, [watchlist]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      verificationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const pushEvent = (label: string, severity: ScannerEvent["severity"] = "info") => {
    setScanEvents((currentEvents) => [buildEvent(label, severity), ...currentEvents].slice(0, MAX_EVENTS));
  };

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

  const resetDemoData = () => {
    setDeals(INITIAL_DEALS);
    setWatchlist([]);
    setScanJob(null);
    pushEvent("Données de démonstration restaurées.", "warning");
  };

  const startFreeScan = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);

    const job = createScanJob();

    setScanJob(job);
    pushEvent("Scan free-tier lancé : crawl simulé, scoring local, zéro clé API.", "info");

    let tick = 0;
    intervalRef.current = window.setInterval(() => {
      tick += 1;
      const { progress, scannedSources, shouldAddDeal } = getScanTickOutcome(tick, FREE_SOURCES.length);

      if (shouldAddDeal) {
        const detectedDeal = buildDetectedDeal(tick);
        setDeals((currentDeals) => dedupeDeals([detectedDeal, ...currentDeals]).slice(0, MAX_DEALS));
        pushEvent(`${detectedDeal.merchant}: ${detectedDeal.discountPercent}% détecté sur ${detectedDeal.title}.`, "success");
      } else {
        pushEvent(`${scannedSources}/${FREE_SOURCES.length} sources inspectées sans doublon critique.`, "info");
      }

      setScanJob((currentJob) => {
        if (!currentJob) return currentJob;

        return {
          ...currentJob,
          status: progress >= 100 ? "completed" : "running",
          progress,
          scannedSources,
          detectedDeals: currentJob.detectedDeals + (shouldAddDeal ? 1 : 0),
        };
      });

      if (progress >= 100 && intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        pushEvent("Scan terminé : deals triés et alertes recalculées.", "success");
      }
    }, 620);
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

  const verifyDeal = (dealId: string) => {
    setDeals((currentDeals) =>
      currentDeals.map((deal) =>
        deal.id === dealId
          ? { ...deal, verificationStatus: "checking", confidenceScore: Math.max(deal.confidenceScore, 75) }
          : deal,
      ),
    );
    pushEvent("Re-vérification lancée sur la fiche marchand.", "info");

    const timeoutId = window.setTimeout(() => {
      setDeals((currentDeals) =>
        currentDeals.map((deal) =>
          deal.id === dealId
            ? {
                ...deal,
                verificationStatus: "verified",
                confidenceScore: calculateConfidence({ ...deal, verificationStatus: "verified" }),
                detectedAt: new Date().toISOString(),
              }
            : deal,
        ),
      );
      pushEvent("Offre confirmée : score de confiance rafraîchi.", "success");
    }, 850);

    verificationTimeoutsRef.current.push(timeoutId);
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
    watchlist,
    setActiveCategory,
    updateFilters,
    clearFilters,
    resetDemoData,
    startFreeScan,
    toggleWatchlist,
    verifyDeal,
  };
}
