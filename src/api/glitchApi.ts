import { QUALITY_THRESHOLDS } from "../config/qualityThresholds";

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

export interface VerifyItemResult {
  status: "verified" | "unavailable" | "needs_api";
  reason: string;
  checkedAt?: string;
  finalPrice?: number;
  shippingFrance?: boolean;
  source?: "api" | "local-preflight";
}

const DEFAULT_API_URL = "";
const REQUEST_TIMEOUT_MS = QUALITY_THRESHOLDS.liveScanRequestTimeoutMs;

function getApiBaseUrl() {
  return (import.meta.env.VITE_GLITCHPRICE_API_URL || DEFAULT_API_URL).trim();
}

export function isGlitchApiConfigured() {
  return getApiBaseUrl().length > 0;
}

function createApiUrl(path: string) {
  if (!isGlitchApiConfigured()) {
    throw new Error("API GlitchPrice non configurée. Ajoute VITE_GLITCHPRICE_API_URL pour activer cette intégration.");
  }

  return new URL(path, getApiBaseUrl());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGlitchItem(value: unknown): value is GlitchItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    typeof value.savingsPercentage === "number" &&
    Number.isFinite(value.savingsPercentage) &&
    typeof value.url === "string" &&
    typeof value.category === "string"
  );
}

function parseGlitchItemsPayload(value: unknown): GlitchItem[] {
  if (!isRecord(value) || !Array.isArray(value.items)) return [];
  return value.items.filter(isGlitchItem);
}

function parseOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseVerifyPayload(value: unknown): VerifyItemResult {
  if (!isRecord(value) || (value.status !== "verified" && value.status !== "unavailable" && value.status !== "needs_api")) {
    return { status: "unavailable", reason: "Réponse de vérification invalide.", source: "api" };
  }

  const result: VerifyItemResult = {
    status: value.status,
    reason: typeof value.reason === "string" ? value.reason : "Aucune raison fournie.",
    source: "api",
  };
  const checkedAt = typeof value.checkedAt === "string" ? value.checkedAt : undefined;
  const finalPrice = parseOptionalNumber(value.finalPrice);
  const shippingFrance = typeof value.shippingFrance === "boolean" ? value.shippingFrance : undefined;

  if (checkedAt) result.checkedAt = checkedAt;
  if (finalPrice !== undefined) result.finalPrice = finalPrice;
  if (shippingFrance !== undefined) result.shippingFrance = shippingFrance;

  return result;
}

async function fetchJson<T>(url: string, options: RequestInit, parse: (value: unknown) => T): Promise<T> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Erreur backend (${response.status})`);
    return parse(await response.json());
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function searchGlitchItems(category: string, keyword: string, website: string): Promise<GlitchItem[]> {
  const searchUrl = createApiUrl("/search");
  searchUrl.search = new URLSearchParams({ category, keyword, website }).toString();

  return fetchJson(searchUrl.toString(), { method: "GET" }, parseGlitchItemsPayload);
}

export async function verifyItem(url: string): Promise<VerifyItemResult> {
  const verifyUrl = createApiUrl("/verify");

  return fetchJson(
    verifyUrl.toString(),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    },
    parseVerifyPayload,
  );
}
