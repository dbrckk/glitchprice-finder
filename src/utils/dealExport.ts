import { DealSignal } from "../types";
import { getOpportunityScore, getSavings } from "./dealScoring";

const CSV_HEADERS = [
  "id",
  "title",
  "merchant",
  "category",
  "price",
  "referencePrice",
  "discountPercent",
  "savings",
  "confidenceScore",
  "opportunityScore",
  "stock",
  "verificationStatus",
  "detectedAt",
  "tags",
  "url",
];

function escapeCsvCell(value: string | number) {
  const serializedValue = String(value);
  return /[",\n;]/.test(serializedValue) ? `"${serializedValue.replaceAll('"', '""')}"` : serializedValue;
}

export function buildDealsCsv(deals: DealSignal[]) {
  const rows = deals.map((deal) => [
    deal.id,
    deal.title,
    deal.merchant,
    deal.category,
    deal.price,
    deal.referencePrice,
    deal.discountPercent,
    getSavings(deal),
    deal.confidenceScore,
    getOpportunityScore(deal),
    deal.stock,
    deal.verificationStatus,
    deal.detectedAt,
    deal.tags.join("|"),
    deal.url,
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function buildExportFilename(date = new Date()) {
  return `glitchprice-deals-${date.toISOString().slice(0, 10)}.csv`;
}
