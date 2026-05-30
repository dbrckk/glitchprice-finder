import { useEffect, useMemo, useRef, useState } from "react";
import { FREE_SOURCES, INITIAL_DEALS } from "../data/mockDeals";
import { calculateConfidence, calculateMetrics, sortDealsByOpportunity } from "../utils/dealScoring";
import { DealCategory, DealSignal, ScanJob } from "../types";

const STORAGE_KEY = "glitchprice.trackedDeals.v1";
const WATCHLIST_KEY = "glitchprice.watchlist.v1";

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
];

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function buildDetectedDeal(scanIndex: number): DealSignal {
  const template = SCAN_TEMPLATES[scanIndex % SCAN_TEMPLATES.length];
  const variance = (scanIndex % 3) * 17;
  const price = Math.max(29, template.basePrice - variance);
  const discountPercent = Math.round(((template.referencePrice - price) / template.referencePrice) * 100);
  const status = scanIndex % 2 === 0 ? "verified" : "tracked";
  const stock: DealSignal["stock"] = scanIndex % 3 === 0 ? "low" : scanIndex % 3 === 1 ? "medium" : "high";
  const detectedAt = new Date().toISOString();

  const partial = {
    discountPercent,
    stock,
    verificationStatus: status as DealSignal["verificationStatus"],
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
    confidenceScore: calculateConfidence(partial),
    detectedAt,
    stock,
    tags: ["auto-scan", ...template.tags],
    sourceId: template.sourceId,
    verificationStatus: status,
    priceHistory: [
      { date: "J-4", price: template.referencePrice },
      { date: "J-3", price: Math.round(template.referencePrice * 0.92) },
      { date: "J-2", price: Math.round(template.referencePrice * 0.84) },
      { date: "Hier", price: Math.round(template.referencePrice * 0.72) },
      { date: "Maintenant", price },
    ],
  };
}

export function useDealTracker() {
  const [deals, setDeals] = useState<DealSignal[]>(() => safeRead(STORAGE_KEY, INITIAL_DEALS));
  const [watchlist, setWatchlist] = useState<string[]>(() => safeRead(WATCHLIST_KEY, []));
  const [activeCategory, setActiveCategory] = useState<DealCategory>("all");
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  }, [deals]);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const filteredDeals = useMemo(() => {
    const scopedDeals = activeCategory === "all" ? deals : deals.filter((deal) => deal.category === activeCategory);
    return sortDealsByOpportunity(scopedDeals);
  }, [activeCategory, deals]);

  const metrics = useMemo(() => calculateMetrics(filteredDeals), [filteredDeals]);

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

    let tick = 0;
    intervalRef.current = window.setInterval(() => {
      tick += 1;
      const progress = Math.min(100, tick * 20);
      const shouldAddDeal = tick === 2 || tick === 4 || tick === 5;

      if (shouldAddDeal) {
        const detectedDeal = buildDetectedDeal(tick);
        setDeals((currentDeals) => [detectedDeal, ...currentDeals].slice(0, 18));
      }

      setScanJob((currentJob) => {
        if (!currentJob) return currentJob;

        return {
          ...currentJob,
          status: progress >= 100 ? "completed" : "running",
          progress,
          scannedSources: Math.min(FREE_SOURCES.length, tick + 1),
          detectedDeals: currentJob.detectedDeals + (shouldAddDeal ? 1 : 0),
        };
      });

      if (progress >= 100 && intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 650);
  };

  const toggleWatchlist = (dealId: string) => {
    setWatchlist((currentWatchlist) =>
      currentWatchlist.includes(dealId)
        ? currentWatchlist.filter((trackedId) => trackedId !== dealId)
        : [dealId, ...currentWatchlist],
    );
  };

  const verifyDeal = (dealId: string) => {
    setDeals((currentDeals) =>
      currentDeals.map((deal) =>
        deal.id === dealId ? { ...deal, verificationStatus: "checking", confidenceScore: Math.max(deal.confidenceScore, 75) } : deal,
      ),
    );

    window.setTimeout(() => {
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
    }, 900);
  };

  return {
    sources: FREE_SOURCES,
    deals: filteredDeals,
    allDeals: deals,
    metrics,
    activeCategory,
    scanJob,
    watchlist,
    setActiveCategory,
    startFreeScan,
    toggleWatchlist,
    verifyDeal,
  };
}
