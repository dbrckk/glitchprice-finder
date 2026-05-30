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
  status: "verified" | "unavailable";
  reason: string;
}

const DEFAULT_API_URL = "https://deal-finder-backend-y9wb.onrender.com";
const REQUEST_TIMEOUT_MS = QUALITY_THRESHOLDS.liveScanRequestTimeoutMs;

function getApiBaseUrl() {
  return import.meta.env.VITE_GLITCHPRICE_API_URL || DEFAULT_API_URL;
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

function parseVerifyPayload(value: unknown): VerifyItemResult {
  if (!isRecord(value) || (value.status !== "verified" && value.status !== "unavailable")) {
    return { status: "unavailable", reason: "Réponse de vérification invalide." };
  }

  return {
    status: value.status,
    reason: typeof value.reason === "string" ? value.reason : "Aucune raison fournie.",
  };
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
  const searchUrl = new URL("/search", getApiBaseUrl());
  searchUrl.search = new URLSearchParams({ category, keyword, website }).toString();

  return fetchJson(searchUrl.toString(), { method: "GET" }, parseGlitchItemsPayload);
}

export async function verifyItem(url: string): Promise<VerifyItemResult> {
  const verifyUrl = new URL("/verify", getApiBaseUrl());

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
