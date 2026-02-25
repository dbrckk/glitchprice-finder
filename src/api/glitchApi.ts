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

const API_URL = "https://deal-finder-backend-y9wb.onrender.com";

export async function fetchGlitches(category: string): Promise<GlitchItem[]> {
  const res = await fetch(`${API_URL}/glitches?category=${category}`);
  if (!res.ok) throw new Error("Erreur backend");
  const data = await res.json();
  return data.items;
}

export async function verifyItem(url: string) {
  const res = await fetch(`${API_URL}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error("Erreur vérification");
  return await res.json();
}
