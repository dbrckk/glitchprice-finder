import { afterEach, describe, expect, it, vi } from "vitest";
import { searchGlitchItems, verifyItem } from "./glitchApi";

describe("glitchApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    });
  });

  it("throws useful backend status errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 503 }));

    await expect(searchGlitchItems("tech", "gpu", "fnac")).rejects.toThrow("Erreur backend (503)");
  });
});
