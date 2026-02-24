// src/api/glitchApi.ts

const API_URL = "https://deal-finder-backend-y9wb.onrender.com";

/**
 * Fetch glitches for a specific category
 */
export const fetchGlitches = async (category: string) => {
  try {
    const res = await fetch(`${API_URL}/glitches?category=${category}`);
    if (!res.ok) throw new Error("Erreur lors de la récupération des glitches");
    const data = await res.json();
    return data.items || [];
  } catch (err) {
    console.error("fetchGlitches error:", err);
    return [];
  }
};

/**
 * Verify a specific item URL
 */
export const verifyItem = async (url: string) => {
  try {
    const res = await fetch(`${API_URL}/verify?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error("Erreur lors de la vérification de l'item");
    const data = await res.json();
    // Return a normalized object with status and reason
    return {
      status: data.status || "unavailable",
      reason: data.reason || "",
    };
  } catch (err) {
    console.error("verifyItem error:", err);
    return { status: "unavailable", reason: "Erreur réseau" };
  }
};

/**
 * Optional: fetch category info if your backend supports it
 */
export const fetchCategoryInfo = async (category: string) => {
  try {
    const res = await fetch(`${API_URL}/categories/${category}`);
    if (!res.ok) throw new Error("Erreur lors de la récupération des infos de catégorie");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("fetchCategoryInfo error:", err);
    return null;
  }
};
