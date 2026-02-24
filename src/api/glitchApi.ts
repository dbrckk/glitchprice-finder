// src/api/glitchApi.ts
export const BASE_URL = "https://deal-finder-backend-y9wb.onrender.com";

// Fetch glitches for a category
export async function fetchGlitches(category: string) {
  try {
    const response = await fetch(`${BASE_URL}/glitches?category=${category}`);
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération: ${response.statusText}`);
    }
    const data = await response.json();
    return data.items || [];
  } catch (error: any) {
    console.error("fetchGlitches error:", error);
    throw error;
  }
}

// Verify a single item by URL
export async function verifyItem(itemUrl: string) {
  try {
    const response = await fetch(`${BASE_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: itemUrl }),
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de la vérification: ${response.statusText}`);
    }
    const data = await response.json();
    return {
      status: data.status || "unavailable",
      reason: data.reason || "",
    };
  } catch (error: any) {
    console.error("verifyItem error:", error);
    return { status: "unavailable", reason: "Erreur vérification" };
  }
}
