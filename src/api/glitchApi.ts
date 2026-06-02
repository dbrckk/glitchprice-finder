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

export interface VerifyItemResponse {
  status: "verified" | "unavailable";
  reason: string;
}

const API_URL = "https://deal-finder-backend-y9wb.onrender.com";

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${fallbackMessage} (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function searchGlitchItems(category: string, keyword: string, website: string): Promise<GlitchItem[]> {
  const params = new URLSearchParams({ category, keyword, website });
  const data = await readJsonResponse<{ items?: GlitchItem[] }>(
    await fetch(`${API_URL}/search?${params.toString()}`),
    "Erreur backend",
  );

  return data.items ?? [];
}

export async function verifyItem(url: string): Promise<VerifyItemResponse> {
  return readJsonResponse<VerifyItemResponse>(
    await fetch(`${API_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }),
    "Erreur verification",
  );
}
