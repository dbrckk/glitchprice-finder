import { useReducer, useCallback } from "react";

export type VerificationStatus = "idle" | "loading" | "available" | "unavailable";

export interface GlitchItem {
  url: string;
  name: string;
  description: string;
  store: string;
  category: string;
  savingsPercentage: number;
  discountedPrice: number;
  nextBestPrice?: { price: number; store: string };
  verificationStatus: VerificationStatus;
  verificationReason?: string;
}

type State = {
  items: GlitchItem[];
  loading: boolean;
  error?: string;
  lastUpdated?: Date;
};

type Action =
  | { type: "setItems"; items: GlitchItem[] }
  | { type: "updateItem"; url: string; updates: Partial<GlitchItem> }
  | { type: "setLoading"; loading: boolean }
  | { type: "setError"; error: string }
  | { type: "setLastUpdated"; date: Date };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "setItems":
      return { ...state, items: action.items };
    case "updateItem":
      return {
        ...state,
        items: state.items.map(i =>
          i.url === action.url ? { ...i, ...action.updates } : i
        ),
      };
    case "setLoading":
      return { ...state, loading: action.loading };
    case "setError":
      return { ...state, error: action.error };
    case "setLastUpdated":
      return { ...state, lastUpdated: action.date };
    default:
      return state;
  }
};

export const useGlitchItems = () => {
  const [state, dispatch] = useReducer(reducer, {
    items: [],
    loading: false,
    error: undefined,
    lastUpdated: undefined,
  });

  const setItems = useCallback((items: GlitchItem[]) =>
    dispatch({ type: "setItems", items }), []);

  const updateItem = useCallback((url: string, updates: Partial<GlitchItem>) =>
    dispatch({ type: "updateItem", url, updates }), []);

  const setLoading = useCallback((loading: boolean) =>
    dispatch({ type: "setLoading", loading }), []);

  const setError = useCallback((error: string) =>
    dispatch({ type: "setError", error }), []);

  const setLastUpdated = useCallback((date: Date) =>
    dispatch({ type: "setLastUpdated", date }), []);

  return { state, setItems, updateItem, setLoading, setError, setLastUpdated };
};