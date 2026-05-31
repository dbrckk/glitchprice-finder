import { DealSignal } from "../types";

export interface DealRiskSignal {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
}

export function evaluateDealRisks(deal: DealSignal): DealRiskSignal[] {
  const risks: DealRiskSignal[] = [];

  if (deal.discountPercent >= 75 && deal.verificationStatus !== "verified") {
    risks.push({ id: "extreme-unverified-discount", label: "Remise extrême non vérifiée", severity: "high" });
  }

  if (/marketplace|vendeur tiers|third-party/i.test(deal.tags.join(" "))) {
    risks.push({ id: "marketplace-seller", label: "Vendeur marketplace à vérifier", severity: "medium" });
  }

  if (deal.stock === "low") {
    risks.push({ id: "low-stock", label: "Risque expiration rapide", severity: "low" });
  }

  return risks;
}
