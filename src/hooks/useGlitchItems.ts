import { useState } from "react";

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

interface GlitchState {
  items: GlitchItem[];
  loading: boolean;
  error: string;
  lastUpdated?: Date;
}

export function useGlitchItems() {
  const [state, setState] = useState<GlitchState>({
    items: [],
    loading: false,
    error: "",
    lastUpdated: undefined,
  });

  const setItems = (items: GlitchItem[]) => {
    setState((prev) => ({ ...prev, items }));
  };

  const updateItem = (url: string, updates: Partial<GlitchItem>) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.url === url ? { ...item, ...updates } : item
      ),
    }));
  };

  const setLoading = (loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  };

  const setError = (error: string) => {
    setState((prev) => ({ ...prev, error }));
  };

  const setLastUpdated = (date: Date) => {
    setState((prev) => ({ ...prev, lastUpdated: date }));
  };

  return {
    state,
    setItems,
    updateItem,
    setLoading,
    setError,
    setLastUpdated,
  };
}
