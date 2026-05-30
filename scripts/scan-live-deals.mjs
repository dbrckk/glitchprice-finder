import { writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SOURCES = [
  { id: "dealabs-hot-fr", name: "Dealabs Hot France", url: "https://www.dealabs.com/hot" },
  { id: "dealabs-new-fr", name: "Dealabs Nouveaux deals", url: "https://www.dealabs.com/new" },
  { id: "amazon-fr-deals", name: "Amazon FR offres du jour", url: "https://www.amazon.fr/gp/goldbox" },
  { id: "fnac-flash-fr", name: "Fnac ventes flash", url: "https://www.fnac.com/ventes-flash" },
];

const FRANCE_MARKERS = [".fr", "france", "livraison", "dealabs.com", "amazon.fr", "fnac.com", "cdiscount.com"];
const REQUEST_TIMEOUT_MS = 10_000;
const PRICE_PATTERN = /(?<!\d)(\d{1,4}(?:[\s.,]\d{3})*(?:[,.]\d{1,2})?)\s?(?:€|eur|euro)/gi;

function cleanText(value) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function normalizePrice(value) {
  const compact = value.replace(/\s/g, "");
  const normalized = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact.replace(/,/g, "");
  return Number.parseFloat(normalized);
}

function extractPrices(text) {
  return Array.from(text.matchAll(PRICE_PATTERN)).map((match) => normalizePrice(match[1] ?? "")).filter(Number.isFinite);
}

function hasFranceDelivery(text, url) {
  const haystack = `${text} ${url}`.toLowerCase();
  return FRANCE_MARKERS.some((marker) => haystack.includes(marker)) && !/us only|uk only|no shipping to france/i.test(haystack);
}

function absolutizeUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

function unescapeJsonString(value) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16))).replace(/\\\//g, "/");
}

function extractEmbeddedDealabsCandidates(html, source) {
  return Array.from(html.matchAll(/"threadId":"?(\d+)"?[\s\S]{0,2500}?"title":"([^"]+)"[\s\S]{0,2500}?"linkHost":"([^"]*)"[\s\S]{0,2500}?"shareableLink":"([^"]+)"[\s\S]{0,1200}?"price":([0-9.]+|null)[\s\S]{0,120}?"nextBestPrice":([0-9.]+|null)/g))
    .map((match) => {
      const price = match[5] === "null" ? undefined : Number.parseFloat(match[5] ?? "");
      const referencePrice = match[6] === "null" ? undefined : Number.parseFloat(match[6] ?? "");
      const discountPercent = price && referencePrice && referencePrice > price ? Math.round(((referencePrice - price) / referencePrice) * 100) : null;
      const title = unescapeJsonString(match[2] ?? "");
      const url = unescapeJsonString(match[4] ?? source.url);
      const host = unescapeJsonString(match[3] ?? "");

      return {
        sourceId: source.id,
        sourceName: source.name,
        title,
        url,
        price,
        referencePrice,
        discountPercent,
        franceDelivery: hasFranceDelivery(`${title} ${host}`, url),
      };
    })
    .filter((candidate) => candidate.price && candidate.franceDelivery && (candidate.discountPercent ?? 0) >= 35)
    .slice(0, 12);
}

function extractCandidates(html, source) {
  const embeddedCandidates = extractEmbeddedDealabsCandidates(html, source);
  if (embeddedCandidates.length) return embeddedCandidates;

  return Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]{20,600}?)<\/a>/gi))
    .map((match) => {
      const url = absolutizeUrl(match[1] ?? source.url, source.url);
      const title = cleanText(match[2] ?? "");
      const prices = extractPrices(title);
      const referencePrice = prices.length > 1 ? Math.max(...prices) : undefined;
      const price = prices.length ? Math.min(...prices) : undefined;
      const discountPercent = price && referencePrice && referencePrice > price ? Math.round(((referencePrice - price) / referencePrice) * 100) : null;

      return {
        sourceId: source.id,
        sourceName: source.name,
        title,
        url,
        price,
        referencePrice,
        discountPercent,
        franceDelivery: hasFranceDelivery(title, url),
      };
    })
    .filter((candidate) => candidate.price && candidate.franceDelivery && (candidate.discountPercent ?? 0) >= 35)
    .slice(0, 12);
}

async function fetchHtml(source) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      headers: {
        "user-agent": "GlitchPriceFinder/0.1 (+https://example.com; free-tier deal research)",
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

async function fetchHtmlWithCurl(source) {
  const { stdout } = await execFileAsync("curl", [
    "-L",
    "--max-time",
    String(Math.ceil(REQUEST_TIMEOUT_MS / 1000)),
    "-A",
    "GlitchPriceFinder/0.1 (+https://example.com; free-tier deal research)",
    source.url,
  ], { maxBuffer: 8 * 1024 * 1024 });

  return stdout;
}

async function fetchSource(source) {
  try {
    return extractCandidates(await fetchHtml(source), source);
  } catch (error) {
    const html = await fetchHtmlWithCurl(source);
    return extractCandidates(html, source);
  }
}

const results = [];
const errors = [];

for (const source of SOURCES) {
  try {
    results.push(...(await fetchSource(source)));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
}

const payload = {
  scannedAt: new Date().toISOString(),
  franceDeliveryRequired: true,
  minDiscountPercent: 35,
  results,
  errors,
};

await mkdir("artifacts", { recursive: true });
const csvHeader = "source,title,url,price,referencePrice,discountPercent,franceDelivery";
const csvRows = results.map((result) =>
  [result.sourceName, result.title, result.url, result.price, result.referencePrice ?? "", result.discountPercent ?? "", result.franceDelivery]
    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
    .join(","),
);

await writeFile("artifacts/live-deals.json", `${JSON.stringify(payload, null, 2)}\n`);
await writeFile("artifacts/live-deals.csv", `${[csvHeader, ...csvRows].join("\n")}\n`);
console.log(JSON.stringify(payload, null, 2));
