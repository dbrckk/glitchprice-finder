import { useEffect, useMemo, useRef, useState } from "react";
import { FREE_SOURCES, INITIAL_DEALS } from "../data/mockDeals";
import {
  buildAlerts,
  calculateConfidence,
  calculateMetrics,
  dealMatchesFilters,
  sortDeals,
} from "../utils/dealScoring";
import { DealCategory, DealFilters, DealSignal, ScanJob, ScannerEvent } from "../types";
import { sanitizeDeals, sanitizeWatchlist } from "../utils/dealValidation";

const STORAGE_KEY = "glitchprice.trackedDeals.v2";
const LEGACY_STORAGE_KEY = "glitchprice.trackedDeals.v1";
const WATCHLIST_KEY = "glitchprice.watchlist.v1";
const MAX_DEALS = 24;
const MAX_EVENTS = 8;

const DEFAULT_FILTERS: DealFilters = {
  query: "",
  minDiscount: 35,
  onlyVerified: false,
  watchlistOnly: false,
  sortMode: "opportunity",
};

const SCAN_TEMPLATES = [
  {
    title: "Apple Watch Ultra 2 titane",
    merchant: "Amazon FR",
    category: "tech" as const,
    sourceId: "amazon-fr-promos",
    image: "⌚",
    referencePrice: 899,
    basePrice: 499,
    tags: ["coupon-hidden", "low-stock"],
  },
  {
    title: "Canapé convertible scandinave 3 places",
    merchant: "Cdiscount",
    category: "home" as const,
    sourceId: "cdiscount-bons-plans",
    image: "🛋️",
    referencePrice: 699,
    basePrice: 279,
    tags: ["destockage", "code-promo"],
  },
  {
    title: "Pack PlayStation 5 Slim + 2 manettes",
    merchant: "Dealabs signalement",
    category: "gaming" as const,
    sourceId: "dealabs-hot",
    image: "🕹️",
    referencePrice: 619,
    basePrice: 389,
    tags: ["community-hot", "bundle"],
  },
  {
    title: "Sneakers premium cuir pleine fleur",
    merchant: "Zalando Privé",
    category: "fashion" as const,
    sourceId: "zalando-prive",
    image: "👟",
    referencePrice: 220,
    basePrice: 74,
    tags: ["vente-privee", "size-alert"],
  },
  {
    title: "Vol Paris - Tokyo aller-retour printemps",
    merchant: "Google Flights signal",
    category: "travel" as const,
    sourceId: "google-flights-watch",
    image: "✈️",
    referencePrice: 845,
    basePrice: 418,
    tags: ["fare-drop", "date-flexible"],
  },
];

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeRead<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (!hasStorage()) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be full or disabled in private browsing; the app should keep running in-memory.
  }
}

function readInitialDeals() {
  const v2Deals = sanitizeDeals(safeRead<unknown>(STORAGE_KEY, null), []);
  if (v2Deals.length) return v2Deals;

  const legacyDeals = sanitizeDeals(safeRead<unknown>(LEGACY_STORAGE_KEY, null), []);
  return legacyDeals.length ? legacyDeals : INITIAL_DEALS;
}

function buildEvent(label: string, severity: ScannerEvent["severity"] = "info"): ScannerEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date().toISOString(),
    label,
    severity,
  };
}

function buildDetectedDeal(scanIndex: number): DealSignal {
  const template = SCAN_TEMPLATES[scanIndex % SCAN_TEMPLATES.length];
  if (!template) throw new Error("Aucun template de scan disponible");

  const variance = (scanIndex % 4) * 19;
  const price = Math.max(29, template.basePrice - variance);
  const discountPercent = Math.round(((template.referencePrice - price) / template.referencePrice) * 100);
  const status = scanIndex % 2 === 0 ? "verified" : "tracked";
  const stock: DealSignal["stock"] = scanIndex % 3 === 0 ? "low" : scanIndex % 3 === 1 ? "medium" : "high";
  const detectedAt = new Date().toISOString();

  const draft = {
    discountPercent,
    stock,
    verificationStatus: status as DealSignal["verificationStatus"],
    priceHistory: [],
  };

  return {
    id: `${template.sourceId}-${Date.now()}-${scanIndex}`,
    title: template.title,
    merchant: template.merchant,
    category: template.category,
    url: `https://example.com/free-scan/${template.sourceId}/${Date.now()}`,
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
    verificationStatus: status,
    priceHistory: [
      { date: "J-4", price: template.referencePrice },
      { date: "J-3", price: Math.round(template.referencePrice * 0.93) },
      { date: "J-2", price: Math.round(template.referencePrice * 0.82) },
      { date: "Hier", price: Math.round(template.referencePrice * 0.7) },
      { date: "Maintenant", price },
    ],
  };
}

export function useDealTracker() {
  const [deals, setDeals] = useState<DealSignal[]>(readInitialDeals);
  const [watchlist, setWatchlist] = useState<string[]>(() => sanitizeWatchlist(safeRead<unknown>(WATCHLIST_KEY, [])));
  const [activeCategory, setActiveCategory] = useState<DealCategory>("all");
  const [filters, setFilters] = useState<DealFilters>(DEFAULT_FILTERS);
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const [scanEvents, setScanEvents] = useState<ScannerEvent[]>(() => [
    buildEvent("Pipeline local prêt : sources publiques + mocks premium chargés.", "success"),
  ]);
  const intervalRef = useRef<number | null>(null);
  const verificationTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    safeWrite(STORAGE_KEY, deals);
  }, [deals]);

  useEffect(() => {
    safeWrite(WATCHLIST_KEY, watchlist);
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

    const job: ScanJob = {
      id: `scan-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "running",
      progress: 0,
      scannedSources: 0,
      detectedDeals: 0,
    };

    setScanJob(job);
    pushEvent("Scan free-tier lancé : crawl simulé, scoring local, zéro clé API.", "info");

    let tick = 0;
    intervalRef.current = window.setInterval(() => {
      tick += 1;
      const progress = Math.min(100, tick * 16.7);
      const scannedSources = Math.min(FREE_SOURCES.length, tick);
      const shouldAddDeal = tick === 2 || tick === 4 || tick === 5 || tick === 6;

      if (shouldAddDeal) {
        const detectedDeal = buildDetectedDeal(tick);
        setDeals((currentDeals) => [detectedDeal, ...currentDeals].slice(0, MAX_DEALS));
        pushEvent(`${detectedDeal.merchant}: ${detectedDeal.discountPercent}% détecté sur ${detectedDeal.title}.`, "success");
      } else {
        pushEvent(`${scannedSources}/${FREE_SOURCES.length} sources inspectées sans doublon critique.`, "info");
      }

      setScanJob((currentJob) => {
        if (!currentJob) return currentJob;

        return {
          ...currentJob,
          status: progress >= 100 ? "completed" : "running",
          progress: Math.round(progress),
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
    deals: filteredDeals,
    allDeals: deals,
    metrics,
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
