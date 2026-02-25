const API_URL = "https://deal-finder-backend-y9wb.onrender.com";

export type GlitchItem = {
  name: string;
  description: string;
  savingsPercentage: number;
  discountedPrice?: number;
  nextBestPrice?: {
    price: number;
    store: string;
  };
  url: string;
  category: string;
};

// Fetch glitches from backend by category
export async function fetchGlitches(category: string): Promise<GlitchItem[]> {
  const res = await fetch(`${API_URL}/glitches?category=${category}`);
  if (!res.ok) {
    throw new Error("Erreur backend");
  }
  const data = await res.json();
  return data.items; // IMPORTANT: returns only the items array
}

// Verify a specific item by URL
export async function verifyItem(url: string): Promise<{ status: string; reason?: string }> {
  const res = await fetch(`${API_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    throw new Error("Erreur vérification");
  }

  const data = await res.json();
  return {
    status: data.status || "unavailable",
    reason: data.reason || "Aucune raison fournie",
  };
}
