import { fetchLiveDeals, verifyDealAvailability } from "./liveDeals";
import { DealCategory, DealSignal } from "../types";

export interface GlitchItem {
  name: string;
  description: string;
  savingsPercentage: number;
  discountedPrice?: number;
  nextBestPrice?: { price: number; store: string };
  url: string;
  category: string;
  verificationStatus?: "idle" | "loading" | "verified" | "unavailable";
  verificationReason?: string;
}

export interface VerifyItemResponse {
  status: "verified" | "unavailable";
  reason: string;
}

const CATEGORY_VALUES = new Set<DealCategory>(["all", "tech", "home", "travel", "fashion", "gaming"]);

function normalizeCategory(category: string): DealCategory {
  return CATEGORY_VALUES.has(category as DealCategory) ? (category as DealCategory) : "all";
}

function matchesText(deal: DealSignal, keyword: string, website: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const normalizedWebsite = website.trim().toLowerCase();
  const haystack = [deal.title, deal.merchant, deal.url, deal.tags.join(" ")].join(" ").toLowerCase();

  return (!normalizedKeyword || haystack.includes(normalizedKeyword)) && (!normalizedWebsite || haystack.includes(normalizedWebsite));
}

function toGlitchItem(deal: DealSignal): GlitchItem {
  return {
    name: deal.title,
    description: `${deal.merchant} • ${deal.tags.join(" • ")}`,
    savingsPercentage: deal.discountPercent,
    discountedPrice: deal.price,
    nextBestPrice: { price: deal.referencePrice, store: "Prix de référence détecté" },
    url: deal.url,
    category: deal.category,
    verificationStatus: deal.verificationStatus === "expired" ? "unavailable" : "verified",
    verificationReason: `${deal.confidenceScore}% de confiance via scraping live`,
  };
}

export async function searchGlitchItems(category: string, keyword = "", website = ""): Promise<GlitchItem[]> {
  const normalizedCategory = normalizeCategory(category);
  const scanResults = await fetchLiveDeals();

  return scanResults
    .flatMap((result) => result.deals)
    .filter((deal) => normalizedCategory === "all" || deal.category === normalizedCategory)
    .filter((deal) => matchesText(deal, keyword, website))
    .map(toGlitchItem);
}

export async function verifyItem(url: string): Promise<VerifyItemResponse> {
  const isAvailable = await verifyDealAvailability(url);

  return {
    status: isAvailable ? "verified" : "unavailable",
    reason: isAvailable ? "Lien accessible au moment de la vérification." : "Lien inaccessible, expiré ou indisponible.",
  };
}
