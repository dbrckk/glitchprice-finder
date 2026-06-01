import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DEFAULT_SOURCES = [
  { id: "dealabs-hot-fr", name: "Dealabs Hot France", url: "https://www.dealabs.com/hot", reliability: 94 },
  { id: "dealabs-new-fr", name: "Dealabs Nouveaux deals", url: "https://www.dealabs.com/new", reliability: 88 },
  { id: "dealabs-price-error-fr", name: "Dealabs erreurs de prix", url: "https://www.dealabs.com/search?q=erreur%20prix", reliability: 90 },
  { id: "amazon-fr-deals", name: "Amazon FR offres du jour", url: "https://www.amazon.fr/gp/goldbox", reliability: 86 },
  { id: "fnac-flash-fr", name: "Fnac ventes flash", url: "https://www.fnac.com/ventes-flash", reliability: 82 },
  { id: "cdiscount-bons-plans-fr", name: "Cdiscount bons plans", url: "https://www.cdiscount.com/bons-plans.html", reliability: 78 },
];

export const DEFAULT_SCAN_OPTIONS = {
  minDiscountPercent: 35,
  maxResults: 30,
  requestTimeoutMs: 10_000,
  artifactsDirectory: "artifacts",
};

const FRANCE_MARKERS = [".fr", "france", "livraison", "dealabs.com", "amazon.fr", "fnac.com", "cdiscount.com", "boulanger.com", "darty.com"];
const BLOCKED_MARKERS = [/us only/i, /usa only/i, /uk only/i, /no shipping to france/i, /livraison impossible/i, /expédié hors ue/i];
const PRICE_PATTERN = /(?<!\d)(\d{1,4}(?:[\s.,]\d{3})*(?:[,.]\d{1,2})?)\s?(?:\u20ac|eur|euro)/gi;
const DEALABS_PATTERN = /"threadId":"?(\d+)"?[\s\S]{0,2500}?"title":"([^"]+)"[\s\S]{0,2500}?"linkHost":"([^"]*)"[\s\S]{0,2500}?"shareableLink":"([^"]+)"[\s\S]{0,1200}?"price":([0-9.]+|null)[\s\S]{0,120}?"nextBestPrice":([0-9.]+|null)/g;

function asNumber(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseScanArgs(argv = []) {
  return argv.reduce((options, arg) => {
    const [name, rawValue] = arg.replace(/^--/, "").split("=");
    if (name === "min-discount") return { ...options, minDiscountPercent: asNumber(rawValue, options.minDiscountPercent) };
    if (name === "max-results") return { ...options, maxResults: asNumber(rawValue, options.maxResults) };
    if (name === "timeout-ms") return { ...options, requestTimeoutMs: asNumber(rawValue, options.requestTimeoutMs) };
    if (name === "artifacts-dir" && rawValue) return { ...options, artifactsDirectory: rawValue };
    return options;
  }, DEFAULT_SCAN_OPTIONS);
}

export function cleanText(value) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

export function normalizePrice(value) {
  const compact = value.replace(/\s/g, "");
  const normalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact.replace(/,/g, "");
  const price = Number.parseFloat(normalized);
  return Number.isFinite(price) ? Math.round(price * 100) / 100 : undefined;
}

export function extractPrices(text) {
  return Array.from(text.matchAll(PRICE_PATTERN)).map((match) => normalizePrice(match[1] ?? "")).filter((price) => price !== undefined && price > 0);
}

export function hasFranceDelivery(text, url) {
  const haystack = `${text} ${url}`.toLowerCase();
  if (BLOCKED_MARKERS.some((marker) => marker.test(haystack))) return false;
  return FRANCE_MARKERS.some((marker) => haystack.includes(marker));
}

export function absolutizeUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

function unescapeJsonString(value) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16))).replace(/\\\//g, "/");
}

function calculateDiscount(price, referencePrice) {
  return price && referencePrice && referencePrice > price ? Math.round(((referencePrice - price) / referencePrice) * 100) : null;
}

function getSourceReliability(source) {
  return source.reliability ?? (source.url.includes("dealabs.com") ? 88 : source.url.includes(".fr") ? 80 : 70);
}

export function scoreCandidate(candidate, source) {
  const discount = candidate.discountPercent ?? 0;
  const referenceGap = candidate.referencePrice && candidate.price ? Math.min(18, Math.round((candidate.referencePrice - candidate.price) / 10)) : 0;
  const sourceScore = Math.round(getSourceReliability(source) * 0.28);
  const deliveryScore = candidate.franceDelivery ? 22 : 0;
  const dealabsBonus = source.url.includes("dealabs.com") ? 8 : 0;
  return Math.min(100, Math.round(discount * 0.7 + sourceScore + deliveryScore + referenceGap + dealabsBonus));
}

function withQuality(candidate, source) {
  const qualityScore = scoreCandidate(candidate, source);
  return {
    ...candidate,
    qualityScore,
    priority: qualityScore >= 90 ? "critical" : qualityScore >= 75 ? "high" : "watch",
    checkoutChecklist: [
      "Ouvrir le marchand et vérifier le prix final TTC",
      "Confirmer disponibilité et livraison en France",
      "Comparer le prix de référence avant achat",
    ],
  };
}

export function extractEmbeddedDealabsCandidates(html, source, options = DEFAULT_SCAN_OPTIONS) {
  return Array.from(html.matchAll(DEALABS_PATTERN))
    .map((match) => {
      const price = match[5] === "null" ? undefined : Number.parseFloat(match[5] ?? "");
      const referencePrice = match[6] === "null" ? undefined : Number.parseFloat(match[6] ?? "");
      const discountPercent = calculateDiscount(price, referencePrice);
      const title = unescapeJsonString(match[2] ?? "");
      const url = unescapeJsonString(match[4] ?? source.url);
      const host = unescapeJsonString(match[3] ?? "");

      return withQuality({
        sourceId: source.id,
        sourceName: source.name,
        title,
        url,
        price,
        referencePrice,
        discountPercent,
        franceDelivery: hasFranceDelivery(`${title} ${host}`, url),
      }, source);
    })
    .filter((candidate) => candidate.price && candidate.franceDelivery && (candidate.discountPercent ?? 0) >= options.minDiscountPercent);
}

export function extractAnchorCandidates(html, source, options = DEFAULT_SCAN_OPTIONS) {
  return Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{20,900}?)<\/a>/gi))
    .map((match) => {
      const url = absolutizeUrl(match[1] ?? source.url, source.url);
      const title = cleanText(match[2] ?? "");
      const prices = extractPrices(title);
      const referencePrice = prices.length > 1 ? Math.max(...prices) : undefined;
      const price = prices.length ? Math.min(...prices) : undefined;
      const discountPercent = calculateDiscount(price, referencePrice);

      return withQuality({
        sourceId: source.id,
        sourceName: source.name,
        title,
        url,
        price,
        referencePrice,
        discountPercent,
        franceDelivery: hasFranceDelivery(title, url),
      }, source);
    })
    .filter((candidate) => candidate.title.length >= 8 && candidate.price && candidate.franceDelivery && (candidate.discountPercent ?? 0) >= options.minDiscountPercent);
}

export function extractCandidates(html, source, options = DEFAULT_SCAN_OPTIONS) {
  const candidates = [...extractEmbeddedDealabsCandidates(html, source, options), ...extractAnchorCandidates(html, source, options)];
  return rankAndDedupeCandidates(candidates).slice(0, 12);
}

function getCandidateKey(candidate) {
  const rawKey = candidate.url || `${candidate.sourceName}-${candidate.title}`;
  return rawKey.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/[^a-z0-9]+/g, "-");
}

export function rankAndDedupeCandidates(candidates, maxResults = DEFAULT_SCAN_OPTIONS.maxResults) {
  const byKey = new Map();
  for (const candidate of candidates) {
    const key = getCandidateKey(candidate);
    const existing = byKey.get(key);
    if (!existing || candidate.qualityScore > existing.qualityScore) byKey.set(key, candidate);
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.qualityScore - a.qualityScore || (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
    .slice(0, maxResults);
}

async function fetchHtml(source, options) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.requestTimeoutMs);

  try {
    const response = await fetch(source.url, {
      headers: {
        "user-agent": "GlitchPriceFinder/0.2 (+https://example.com; free-tier deal research)",
        accept: "text/html,application/xhtml+xml,application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`${source.name}: HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchHtmlWithCurl(source, options) {
  const { stdout } = await execFileAsync("curl", [
    "-L",
    "--max-time",
    String(Math.ceil(options.requestTimeoutMs / 1000)),
    "-A",
    "GlitchPriceFinder/0.2 (+https://example.com; free-tier deal research)",
    source.url,
  ], { maxBuffer: 10 * 1024 * 1024 });

  return stdout;
}

export async function fetchSource(source, options = DEFAULT_SCAN_OPTIONS) {
  try {
    return extractCandidates(await fetchHtml(source, options), source, options);
  } catch (fetchError) {
    const html = await fetchHtmlWithCurl(source, options);
    const candidates = extractCandidates(html, source, options);
    return candidates.map((candidate) => ({ ...candidate, fetchFallback: true, fetchWarning: fetchError instanceof Error ? fetchError.message : String(fetchError) }));
  }
}

export async function scanSources(sources = DEFAULT_SOURCES, options = DEFAULT_SCAN_OPTIONS) {
  const results = [];
  const errors = [];
  const sourceReports = [];

  for (const source of sources) {
    const startedAt = Date.now();
    try {
      const sourceResults = await fetchSource(source, options);
      results.push(...sourceResults);
      sourceReports.push({ sourceId: source.id, sourceName: source.name, status: "ok", results: sourceResults.length, durationMs: Date.now() - startedAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${source.name}: ${message}`);
      sourceReports.push({ sourceId: source.id, sourceName: source.name, status: "error", results: 0, durationMs: Date.now() - startedAt, error: message });
    }
  }

  const rankedResults = rankAndDedupeCandidates(results, options.maxResults);
  return createPayload(rankedResults, errors, sourceReports, options);
}

export function createPayload(results, errors, sourceReports, options = DEFAULT_SCAN_OPTIONS) {
  const criticalCount = results.filter((result) => result.priority === "critical").length;
  const averageDiscount = results.length ? Math.round(results.reduce((sum, result) => sum + (result.discountPercent ?? 0), 0) / results.length) : 0;

  return {
    scannedAt: new Date().toISOString(),
    franceDeliveryRequired: true,
    minDiscountPercent: options.minDiscountPercent,
    maxResults: options.maxResults,
    summary: {
      totalResults: results.length,
      criticalCount,
      averageDiscount,
      healthySources: sourceReports.filter((report) => report.status === "ok").length,
      failedSources: sourceReports.filter((report) => report.status === "error").length,
    },
    results,
    sourceReports,
    errors,
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function buildCsv(results) {
  const csvHeader = "priority,qualityScore,source,title,url,price,referencePrice,discountPercent,franceDelivery";
  const csvRows = results.map((result) =>
    [result.priority, result.qualityScore, result.sourceName, result.title, result.url, result.price, result.referencePrice, result.discountPercent, result.franceDelivery]
      .map(csvEscape)
      .join(","),
  );

  return `${[csvHeader, ...csvRows].join("\n")}\n`;
}

export async function writeScanArtifacts(payload, options = DEFAULT_SCAN_OPTIONS) {
  await mkdir(options.artifactsDirectory, { recursive: true });
  await writeFile(`${options.artifactsDirectory}/live-deals.json`, `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(`${options.artifactsDirectory}/live-deals.csv`, buildCsv(payload.results));
}
