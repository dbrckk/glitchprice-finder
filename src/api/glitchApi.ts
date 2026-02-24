// src/api/glitchApi.ts

const API_URL = "https://deal-finder-backend-y9wb.onrender.com";

export interface GlitchItem {
  name: string;
  url: string;
  description?: string;
  category: string;
  savingsPercentage: number;
  verificationStatus?: "idle" | "loading" | "available" | "unavailable";
  verificationReason?: string;
}

/**
 * Fetch glitch items from backend
 * @param category string, defaults to "all"
 * @returns array of GlitchItem
 */
export const fetchGlitches = async (category: string = "all"): Promise<GlitchItem[]> => {
  const res = await fetch(`${API_URL}/glitches?category=${category}`);
  if (!res.ok) {
    throw new Error("Erreur lors de la récupération des glitches");
  }
  return res.json();
};

/**
 * Verify an item availability
 * @param url string of the item
 * @returns {status: "available" | "unavailable", reason?: string}
 */
export const verifyItem = async (url: string): Promise<{ status: "available" | "unavailable"; reason?: string }> => {
  const res = await fetch(`${API_URL}/verify?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    throw new Error("Erreur lors de la vérification de l'article");
  }
  return res.json();
};
