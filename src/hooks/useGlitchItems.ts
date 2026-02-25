import { useState } from "react";
import { GlitchItem } from "../api/glitchApi";

interface GlitchState {
  items: GlitchItem[];
  loading: boolean;
  error: string;
  lastUpdated: Date | null;
  progress: string;
}

export function useGlitchItems() {
  const [state, setState] = useState<GlitchState>({
    items: [],
    loading: false,
    error: "",
    lastUpdated: null,
    progress: "",
  });

  const setItems = (items: GlitchItem[]) =>
    setState((s) => ({ ...s, items }));

  const addOrReplaceItem = (newItem: GlitchItem) => {
    setState((s) => {
      const items = [...s.items];
      const index = items.findIndex((i) => i.verificationStatus === "unavailable");
      if (index !== -1) items[index] = newItem;
      else if (items.length < 5) items.push(newItem);
      return { ...s, items };
    });
  };

  const updateItem = (url: string, updates: Partial<GlitchItem>) =>
    setState((s) => ({
      ...s,
      items: s.items.map((item) => (item.url === url ? { ...item, ...updates } : item)),
    }));

  const setLoading = (loading: boolean) =>
    setState((s) => ({ ...s, loading }));

  const setError = (error: string) =>
    setState((s) => ({ ...s, error }));

  const setLastUpdated = (date: Date) =>
    setState((s) => ({ ...s, lastUpdated: date }));

  const setProgress = (progress: string) =>
    setState((s) => ({ ...s, progress }));

  return { state, setItems, addOrReplaceItem, updateItem, setLoading, setError, setLastUpdated, setProgress };
}
