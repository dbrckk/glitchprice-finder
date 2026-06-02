import { DealCategory, DealSignal, DealSource } from "../types";
import { calculateConfidence } from "../utils/dealScoring";

const FETCH_TIMEOUT_MS = 9000;
const MAX_ITEMS_PER_SOURCE = 18;
const MIN_DEEP_DISCOUNT_PERCENT = 70;
const PROXY_URL = "https://api.codetabs.com/v1/proxy/";
const PRICE_ERROR_PATTERNS = [/erreur\s+de\s+prix/i, /erreur\s+prix/i, /price\s*error/i, /glitch/i, /bug\s+prix/i];

type LiveSourceMode = "rss" | "html" | "markdown";

export interface LiveFeedSource extends DealSource {
  mode: LiveSourceMode;
  feedUrl?: string;
  scrapeUrl?: string;
  fallbackCategory: Exclude<DealCategory, "all">;
  minDiscountPercent?: number;
}

interface DealabsThreadPayload {
  threadId: number | string;
  title: string;
  titleSlug?: string;
  isExpired?: boolean;
  isTrending?: boolean;
  isHot?: boolean;
  temperature?: number;
  publishedAt?: number;
  hotDate?: number;
  link?: string;
  shareableLink?: string;
  linkHost?: string;
  price?: number;
  nextBestPrice?: number;
  percentage?: number;
  merchant?: { merchantName?: string };
  mainGroup?: { threadGroupName?: string };
  mainImage?: { path?: string; name?: string };
}

export interface LiveScanResult {
  sourceId: string;
  deals: DealSignal[];
  error?: string;
}

export const LIVE_FEEDS: LiveFeedSource[] = [
  {
    id: "dealabs-scrape-hot-70",
    name: "Scraper Dealabs hot ≥ 70%",
    url: "https://www.dealabs.com/hot",
    scrapeUrl: "https://www.dealabs.com/hot",
    mode: "html",
    category: "tech",
    fallbackCategory: "tech",
    cadenceMinutes: 5,
    reliability: 95,
    minDiscountPercent: MIN_DEEP_DISCOUNT_PERCENT,
  },
  {
    id: "dealabs-scrape-gratuit",
    name: "Scraper gratuits & erreurs",
    url: "https://www.dealabs.com/groupe/gratuit",
    scrapeUrl: "https://www.dealabs.com/groupe/gratuit",
    mode: "html",
    category: "gaming",
    fallbackCategory: "gaming",
    cadenceMinutes: 5,
    reliability: 92,
    minDiscountPercent: MIN_DEEP_DISCOUNT_PERCENT,
  },
  {
    id: "dealabs-scrape-high-tech",
    name: "Scraper high-tech profond",
    url: "https://www.dealabs.com/groupe/high-tech",
    scrapeUrl: "https://www.dealabs.com/groupe/high-tech",
    mode: "html",
    category: "tech",
    fallbackCategory: "tech",
    cadenceMinutes: 8,
    reliability: 90,
    minDiscountPercent: MIN_DEEP_DISCOUNT_PERCENT,
  },
  {
    id: "amazon-direct-markdown",
    name: "Amazon FR direct goldbox",
    url: "https://www.amazon.fr/gp/goldbox",
    scrapeUrl: "https://r.jina.ai/http://r.jina.ai/http://https://www.amazon.fr/gp/goldbox",
    mode: "markdown",
    category: "tech",
    fallbackCategory: "tech",
    cadenceMinutes: 6,
    reliability: 82,
    minDiscountPercent: MIN_DEEP_DISCOUNT_PERCENT,
  },
  {
    id: "amazon-fr-deep-rss",
    name: "Amazon FR 70%+ & erreurs",
    url: "https://www.amazon.fr/gp/goldbox",
    feedUrl: "https://www.dealabs.com/rss?q=amazon",
    mode: "rss",
    category: "tech",
    fallbackCategory: "tech",
    cadenceMinutes: 6,
    reliability: 88,
    minDiscountPercent: MIN_DEEP_DISCOUNT_PERCENT,
  },
  {
    id: "cdiscount-deep-rss",
    name: "Cdiscount 70%+ & erreurs",
    url: "https://www.cdiscount.com/bons-plans.html",
    feedUrl: "https://www.dealabs.com/rss?q=cdiscount",
    mode: "rss",
    category: "home",
    fallbackCategory: "home",
    cadenceMinutes: 6,
    reliability: 84,
    minDiscountPercent: MIN_DEEP_DISCOUNT_PERCENT,
  },
  {
    id: "fnac-deep-rss",
    name: "Fnac 70%+ & erreurs",
    url: "https://www.fnac.com/ventes-flash",
    feedUrl: "https://www.dealabs.com/rss?q=fnac",
    mode: "rss",
    category: "tech",
    fallbackCategory: "tech",
    cadenceMinutes: 6,
    reliability: 84,
    minDiscountPercent: MIN_DEEP_DISCOUNT_PERCENT,
  },
  {
    id: "price-error-rss",
    name: "Erreurs de prix multi-marchands",
    url: "https://www.dealabs.com/search?q=erreur%20prix",
    feedUrl: "https://www.dealabs.com/rss?q=erreur%20prix",
    mode: "rss",
    category: "tech",
    fallbackCategory: "tech",
    cadenceMinutes: 4,
    reliability: 90,
    minDiscountPercent: MIN_DEEP_DISCOUNT_PERCENT,
  },
  {
    id: "dealabs-rss-tendance",
    name: "RSS tendances backup",
    url: "https://www.dealabs.com/hot",
    feedUrl: "https://www.dealabs.com/rss/tendance",
    mode: "rss",
    category: "home",
    fallbackCategory: "home",
    cadenceMinutes: 5,
    reliability: 86,
    minDiscountPercent: MIN_DEEP_DISCOUNT_PERCENT,
  },
];

const CATEGORY_RULES: Array<{ category: Exclude<DealCategory, "all">; patterns: RegExp[] }> = [
  { category: "gaming", patterns: [/jeu/i, /gaming/i, /console/i, /playstation/i, /xbox/i, /nintendo/i, /steam/i] },
  { category: "tech", patterns: [/informatique/i, /high-tech/i, /smartphone/i, /pc/i, /ssd/i, /laptop/i, /audio/i, /tv/i] },
  { category: "travel", patterns: [/voyage/i, /vol/i, /hotel/i, /train/i, /sejour/i, /vacances/i] },
  { category: "fashion", patterns: [/mode/i, /vetement/i, /chaussure/i, /sneaker/i, /parfum/i, /montre/i] },
  { category: "home", patterns: [/maison/i, /jardin/i, /bricolage/i, /cuisine/i, /meuble/i, /famille/i, /enfants/i] },
];

function proxiedUrl(url: string) {
  return `${PROXY_URL}?quest=${encodeURIComponent(url)}`;
}

async function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchText(url: string): Promise<string> {
  try {
    return await fetchWithTimeout(proxiedUrl(url));
  } catch {
    // Proxy first avoids browser CORS noise. Direct fetch remains as a fallback for environments that allow it.
    return fetchWithTimeout(url);
  }
}

function textFrom(item: Element, selector: string) {
  return item.querySelector(selector)?.textContent?.trim() ?? "";
}

function parsePrice(rawPrice: string, title: string, description: string) {
  const candidates = [rawPrice, title, description];
  for (const candidate of candidates) {
    const match = candidate.match(/(\d{1,5}(?:[\s.,]\d{2})?)\s*(?:€|eur|euro|\$)/i);
    if (!match) continue;

    const value = Number(match[1].replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(value) && value >= 0) return value;
  }

  return 0;
}

function parseTemperature(title: string) {
  const match = title.match(/(-?\d{1,4})\s*°/);
  return match ? Number(match[1]) : 0;
}

function parseDiscount(title: string, temperature: number, price: number, nextBestPrice: number, explicitPercentage = 0) {
  if (explicitPercentage > 0) return Math.min(99, Math.round(explicitPercentage));

  if (nextBestPrice > price && nextBestPrice > 0) {
    return Math.min(99, Math.round(((nextBestPrice - price) / nextBestPrice) * 100));
  }

  const discountMatch = title.match(/[-−]\s*(\d{1,2})\s*%/);
  if (discountMatch) return Math.min(99, Math.max(1, Number(discountMatch[1])));

  if (/gratuit|free/i.test(title) && price === 0) return 100;
  if (PRICE_ERROR_PATTERNS.some((pattern) => pattern.test(title))) return 90;
  if (temperature >= 500) return 70;
  if (temperature >= 250) return 58;
  if (temperature >= 100) return 45;
  if (temperature >= 30) return 32;
  return 18;
}

function inferReferencePrice(price: number, discountPercent: number, nextBestPrice = 0) {
  if (nextBestPrice > price) return Math.round(nextBestPrice);
  if (price <= 0) return discountPercent >= 100 ? 1 : 0;
  return Math.round(price / (1 - Math.min(discountPercent, 95) / 100));
}

function safeIsoDate(value: string | number | undefined) {
  if (!value) return new Date().toISOString();
  const timestamp = typeof value === "number" ? value * 1000 : Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
}

function stableId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function normalizeTitle(title: string) {
  return title.replace(/^[-\d\s°]+/, "").replace(/\s+/g, " ").trim();
}

function categoryFrom(categoryLabel: string, title: string, fallback: Exclude<DealCategory, "all">) {
  const haystack = `${categoryLabel} ${title}`;
  return CATEGORY_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(haystack)))?.category ?? fallback;
}

function stockFromTemperature(temperature: number, isPriceError: boolean): DealSignal["stock"] {
  if (isPriceError || temperature >= 250) return "low";
  if (temperature >= 60) return "medium";
  return "high";
}

function buildHistory(referencePrice: number, price: number) {
  if (referencePrice <= 0) return [];

  return [
    { date: "Prix réf.", price: referencePrice },
    { date: "Alerte", price: Math.max(price, Math.round(referencePrice * 0.45)) },
    { date: "Scrap", price },
  ];
}

function isDeepOpportunity(title: string, discountPercent: number, source: LiveFeedSource) {
  const threshold = source.minDiscountPercent ?? MIN_DEEP_DISCOUNT_PERCENT;
  return discountPercent >= threshold || PRICE_ERROR_PATTERNS.some((pattern) => pattern.test(title));
}

function dealabsImageUrl(image?: DealabsThreadPayload["mainImage"]) {
  if (!image?.path || !image.name) return "";
  return `https://static-pepper.dealabs.com/${image.path}/${image.name}/re/300x300/qt/70/${image.name}.jpg`;
}

function parseFeed(xml: string, source: LiveFeedSource): DealSignal[] {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) throw new Error("Flux RSS illisible");

  return Array.from(document.querySelectorAll("item"))
    .slice(0, MAX_ITEMS_PER_SOURCE)
    .map((item) => {
      const rawTitle = textFrom(item, "title");
      const description = textFrom(item, "description");
      const link = textFrom(item, "link") || textFrom(item, "guid");
      const categoryLabel = textFrom(item, "category");
      const publishedAt = textFrom(item, "pubDate");
      const merchantNode = item.getElementsByTagName("pepper:merchant")[0];
      const merchant = merchantNode?.getAttribute("name") || "Source live";
      const rawPrice = merchantNode?.getAttribute("price") ?? "";
      const temperature = parseTemperature(rawTitle);
      const title = normalizeTitle(rawTitle) || rawTitle;
      const price = parsePrice(rawPrice, rawTitle, description);
      const discountPercent = parseDiscount(rawTitle, temperature, price, 0);
      const referencePrice = inferReferencePrice(price, discountPercent);
      const isPriceError = PRICE_ERROR_PATTERNS.some((pattern) => pattern.test(rawTitle));
      const stock = stockFromTemperature(temperature, isPriceError);
      const category = categoryFrom(categoryLabel, rawTitle, source.fallbackCategory);
      const verificationStatus: DealSignal["verificationStatus"] = temperature >= 80 || isPriceError ? "verified" : "tracked";
      const confidenceScore = calculateConfidence({ discountPercent, stock, verificationStatus });
      const image = item.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") ??
        item.getElementsByTagName("media:content")[0]?.getAttribute("url") ??
        "";

      return {
        id: `${source.id}-${stableId(link || title)}`,
        title,
        merchant,
        category,
        url: link || source.url,
        image,
        price,
        referencePrice,
        currency: "EUR" as const,
        discountPercent,
        confidenceScore,
        detectedAt: safeIsoDate(publishedAt),
        stock,
        tags: ["rss-backup", discountPercent >= 70 ? "70-plus" : "hot", isPriceError ? "price-error" : "", categoryLabel].filter(Boolean),
        sourceId: source.id,
        verificationStatus,
        priceHistory: buildHistory(referencePrice, price),
      };
    })
    .filter((deal) => deal.title && deal.url && deal.referencePrice > deal.price && isDeepOpportunity(deal.title, deal.discountPercent, source));
}

function normalizeAmazonTitle(rawText: string) {
  return rawText
    .replace(/^\d{1,2}%\s+off\s+/i, "")
    .replace(/^(limited time deal|with prime|with deal):?\s*/i, "")
    .replace(/deal price:\s*€?[\d.,]+€?[\d.,]*/i, "")
    .replace(/lowest:\s*lowest:\s*€?[\d.,]+€?[\d.,]*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseAmazonMarkdown(markdown: string, source: LiveFeedSource): DealSignal[] {
  const imageByUrl = new Map<string, string>();
  const imagePattern = /\[!\[[^\]]*]\((https:\/\/m\.media-amazon\.com\/images\/[^)]+)\)]\((https:\/\/www\.amazon\.fr\/[^)]+)\)/g;
  for (const match of markdown.matchAll(imagePattern)) {
    imageByUrl.set(match[2].split("?")[0], match[1]);
  }

  const dealPattern = /\[(\d{1,2})%\s+off\s+([^\]]*?Deal Price:\s*€[\d.,]+[\s\S]*?)\]\((https:\/\/www\.amazon\.fr\/[^)]+)\)/g;
  const deals = Array.from(markdown.matchAll(dealPattern)).map<DealSignal | null>((match) => {
    const discountPercent = Number(match[1]);
    const rawText = match[2];
    const url = match[3];
    const prices = Array.from(rawText.matchAll(/€\s*(\d{1,5}(?:[.,]\d{2})?)/g)).map((priceMatch) =>
      Number(priceMatch[1].replace(",", ".")),
    );
    const price = prices[0] ?? 0;
    const referencePrice = Math.max(...prices.slice(1), inferReferencePrice(price, discountPercent));
    const title = normalizeAmazonTitle(rawText);
    const isPriceError = PRICE_ERROR_PATTERNS.some((pattern) => pattern.test(title));

    if (!title || !isDeepOpportunity(title, discountPercent, source)) return null;

    const verificationStatus: DealSignal["verificationStatus"] = isPriceError || discountPercent >= 70 ? "verified" : "tracked";
    const stock = stockFromTemperature(discountPercent * 4, isPriceError);

    return {
      id: `${source.id}-${stableId(url)}`,
      title,
      merchant: "Amazon FR",
      category: categoryFrom("Amazon", title, source.fallbackCategory),
      url,
      image: imageByUrl.get(url.split("?")[0]) ?? "",
      price,
      referencePrice,
      currency: "EUR" as const,
      discountPercent,
      confidenceScore: calculateConfidence({ discountPercent, stock, verificationStatus }),
      detectedAt: new Date().toISOString(),
      stock,
      tags: ["scrap-amazon", "amazon-direct", discountPercent >= 70 ? "70-plus" : "", isPriceError ? "price-error" : ""].filter(Boolean),
      sourceId: source.id,
      verificationStatus,
      priceHistory: buildHistory(referencePrice, price),
    };
  });

  return deals.filter((deal): deal is DealSignal => Boolean(deal)).slice(0, MAX_ITEMS_PER_SOURCE);
}

function parseThreadPayload(rawPayload: string): DealabsThreadPayload | null {
  try {
    const parsed = JSON.parse(rawPayload) as { props?: { thread?: DealabsThreadPayload } };
    return parsed.props?.thread ?? null;
  } catch {
    return null;
  }
}

function dealFromThread(thread: DealabsThreadPayload, source: LiveFeedSource): DealSignal | null {
  if (!thread.title || thread.isExpired) return null;

  const price = Math.max(0, Number(thread.price ?? 0));
  const nextBestPrice = Math.max(0, Number(thread.nextBestPrice ?? 0));
  const temperature = Number(thread.temperature ?? 0);
  const title = normalizeTitle(thread.title) || thread.title;
  const discountPercent = parseDiscount(title, temperature, price, nextBestPrice, Number(thread.percentage ?? 0));
  if (!isDeepOpportunity(title, discountPercent, source)) return null;

  const referencePrice = inferReferencePrice(price, discountPercent, nextBestPrice);
  if (referencePrice <= price && !PRICE_ERROR_PATTERNS.some((pattern) => pattern.test(title))) return null;

  const categoryLabel = thread.mainGroup?.threadGroupName ?? "";
  const isPriceError = PRICE_ERROR_PATTERNS.some((pattern) => pattern.test(title));
  const stock = stockFromTemperature(temperature, isPriceError);
  const verificationStatus: DealSignal["verificationStatus"] = isPriceError || thread.isHot || thread.isTrending ? "verified" : "tracked";
  const confidenceScore = calculateConfidence({ discountPercent, stock, verificationStatus });
  const merchant = thread.merchant?.merchantName || thread.linkHost || "Dealabs scrape";
  const dealUrl = thread.titleSlug
    ? `https://www.dealabs.com/bons-plans/${thread.titleSlug}-${thread.threadId}`
    : `https://www.dealabs.com/bons-plans/${thread.threadId}`;

  return {
    id: `${source.id}-${thread.threadId}`,
    title,
    merchant,
    category: categoryFrom(categoryLabel, title, source.fallbackCategory),
    url: dealUrl,
    image: dealabsImageUrl(thread.mainImage),
    price,
    referencePrice,
    currency: "EUR",
    discountPercent,
    confidenceScore,
    detectedAt: safeIsoDate(thread.publishedAt || thread.hotDate),
    stock,
    tags: [
      "scrap-html",
      discountPercent >= 70 ? "70-plus" : "",
      isPriceError ? "price-error" : "deep-deal",
      temperature ? `${Math.round(temperature)}deg` : "",
      categoryLabel,
    ].filter(Boolean),
    sourceId: source.id,
    verificationStatus,
    priceHistory: buildHistory(referencePrice, price),
  };
}

function parseScrapedPage(html: string, source: LiveFeedSource): DealSignal[] {
  const document = new DOMParser().parseFromString(html, "text/html");
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-vue3*="ThreadMainListItemNormalizer"]'));
  const deals = candidates
    .map((node) => parseThreadPayload(node.getAttribute("data-vue3") ?? ""))
    .filter((thread): thread is DealabsThreadPayload => Boolean(thread))
    .map((thread) => dealFromThread(thread, source))
    .filter((deal): deal is DealSignal => Boolean(deal));

  return Array.from(new Map(deals.map((deal) => [deal.id, deal])).values()).slice(0, MAX_ITEMS_PER_SOURCE);
}

export async function fetchLiveFeed(source: LiveFeedSource): Promise<LiveScanResult> {
  try {
    const url = source.mode === "rss" ? source.feedUrl : source.scrapeUrl;
    if (!url) throw new Error("Source mal configurée");

    const payload = await fetchText(url);
    const deals =
      source.mode === "html"
        ? parseScrapedPage(payload, source)
        : source.mode === "markdown"
          ? parseAmazonMarkdown(payload, source)
          : parseFeed(payload, source);
    return { sourceId: source.id, deals };
  } catch (error) {
    return {
      sourceId: source.id,
      deals: [],
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}

export async function fetchLiveDeals(sources: LiveFeedSource[] = LIVE_FEEDS): Promise<LiveScanResult[]> {
  return Promise.all(sources.map((source) => fetchLiveFeed(source)));
}

export async function verifyDealAvailability(url: string): Promise<boolean> {
  const html = await fetchText(url);
  return html.length > 250 && !/not found|introuvable|expired|expire|indisponible/i.test(html.slice(0, 5000));
}
