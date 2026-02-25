import { useState } from "react";
import { GlitchItem } from "../api/glitchApi";

interface GlitchState {
  items: GlitchItem[];
  loading: boolean;
  error: string;
  lastUpdated: Date | null;
}

export function useGlitchItems() {
  const [state, setState] = useState<GlitchState>({
    items: [],
    loading: false,
    error: "",
    lastUpdated: null,
  });

  const setItems = (items: GlitchItem[]) =>
    setState((s) => ({ ...s, items }));

  const updateItem = (url: string, updates: Partial<GlitchItem>) =>
    setState((s) => ({
      ...s,
      items: s.items.map((item) =>
        item.url === url ? { ...item, ...updates } : item
      ),
    }));

  const setLoading = (loading: boolean) =>
    setState((s) => ({ ...s, loading }));

  const setError = (error: string) =>
    setState((s) => ({ ...s, error }));

  const setLastUpdated = (date: Date) =>
    setState((s) => ({ ...s, lastUpdated: date }));

  return { state, setItems, updateItem, setLoading, setError, setLastUpdated };
}
