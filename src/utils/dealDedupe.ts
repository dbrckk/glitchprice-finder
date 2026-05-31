import { DealSignal } from "../types";

function normalizeDealKey(value: string) {
  return value.toLowerCase().replace(/https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/[^a-z0-9]+/g, "-");
}

export function getDealDedupeKey(deal: Pick<DealSignal, "url" | "title" | "merchant">) {
  return `${normalizeDealKey(deal.merchant)}::${normalizeDealKey(deal.url || deal.title)}`;
}

export function dedupeDeals<T extends Pick<DealSignal, "url" | "title" | "merchant" | "confidenceScore">>(deals: T[]) {
  const byKey = new Map<string, T>();

  deals.forEach((deal) => {
    const key = getDealDedupeKey(deal);
    const existing = byKey.get(key);
    if (!existing || deal.confidenceScore > existing.confidenceScore) byKey.set(key, deal);
  });

  return Array.from(byKey.values());
}
