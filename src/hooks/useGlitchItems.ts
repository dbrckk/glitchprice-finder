// src/hooks/useGlitchItems.ts
import { useState, useCallback } from "react";
import { GlitchItem, fetchGlitches, verifyItem } from "../api/glitchApi";

export function useGlitchItems() {
  const [items, setItems] = useState<GlitchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch glitches from backend
  const scanItems = useCallback(async (category: string) => {
    setLoading(true);
    setError("");
    try {
      const results = await fetchGlitches(category);
      const itemsWithStatus = results.map((item) => ({
        ...item,
        verificationStatus: "idle" as GlitchItem["verificationStatus"],
      }));
      setItems(itemsWithStatus);
      setLastUpdated(new Date());
    } catch (err) {
      setError("Erreur lors du scan.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify a single item
  const verifySingleItem = useCallback(async (url: string) => {
    // Set loading status
    setItems((prev) =>
      prev.map((i) =>
        i.url === url ? { ...i, verificationStatus: "loading" } : i
      )
    );

    try {
      const res = await verifyItem(url);
      setItems((prev) =>
        prev.map((i) =>
          i.url === url
            ? { ...i, verificationStatus: res.status, verificationReason: res.reason }
            : i
        )
      );
    } catch {
      setItems((prev) =>
        prev.map((i) =>
          i.url === url
            ? { ...i, verificationStatus: "unavailable", verificationReason: "Erreur vérification" }
            : i
        )
      );
    }
  }, []);

  // Update item manually (optional)
  const updateItem = useCallback(
    (url: string, data: Partial<GlitchItem>) => {
      setItems((prev) =>
        prev.map((i) => (i.url === url ? { ...i, ...data } : i))
      );
    },
    []
  );

  return {
    state: { items, loading, error, lastUpdated },
    setItems,
    setLoading,
    setError,
    setLastUpdated,
    scanItems,
    verifySingleItem,
    updateItem,
  };
}
