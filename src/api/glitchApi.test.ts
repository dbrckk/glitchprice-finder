import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isGlitchApiConfigured, searchGlitchItems, verifyItem } from "./glitchApi";

const API_URL = "https://api.glitchprice.test";

describe("glitchApi", () => {
  beforeEach(() => {
    import.meta.env.VITE_GLITCHPRICE_API_URL = API_URL;
  });

  afterEach(() => {
    import.meta.env.VITE_GLITCHPRICE_API_URL = "";
    vi.restoreAllMocks();
  });

  it("detects optional API configuration", () => {
    expect(isGlitchApiConfigured()).toBe(true);
    import.meta.env.VITE_GLITCHPRICE_API_URL = "";
    expect(isGlitchApiConfigured()).toBe(false);
  });

  it("encodes search params and filters malformed items", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              name: "SSD NVMe",
              description: "Promo flash",
              savingsPercentage: 62,
              url: "https://example.com/ssd",
              category: "tech",
            },
            { name: "broken" },
          ],
        }),
        { status: 200 },
      ),
    );

    const items = await searchGlitchItems("tech", "ssd nvme", "amazon.fr/promos");
    const requestedUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(requestedUrl.origin).toBe(API_URL);
    expect(requestedUrl.pathname).toBe("/search");
    expect(requestedUrl.searchParams.get("keyword")).toBe("ssd nvme");
    expect(requestedUrl.searchParams.get("website")).toBe("amazon.fr/promos");
    expect(items).toHaveLength(1);
    expect(items[0]?.savingsPercentage).toBe(62);
  });

  it("normalizes invalid verify payloads instead of throwing shape errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ status: "maybe" }), { status: 200 }));

    await expect(verifyItem("https://example.com/deal")).resolves.toEqual({
      status: "unavailable",
      reason: "Réponse de vérification invalide.",
      source: "api",
    });
  });

  it("throws useful backend status errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 503 }));

    await expect(searchGlitchItems("tech", "gpu", "fnac")).rejects.toThrow("Erreur backend (503)");
  });

  it("fails fast when the optional backend API is not configured", async () => {
    import.meta.env.VITE_GLITCHPRICE_API_URL = "";

    await expect(searchGlitchItems("tech", "gpu", "fnac")).rejects.toThrow("API GlitchPrice non configurée");
  });
});
