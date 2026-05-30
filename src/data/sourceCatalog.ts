import { DealCategory } from "../types";

export type LiveSourceKind = "html" | "rss";

export interface LiveDealSource {
  id: string;
  name: string;
  url: string;
  kind: LiveSourceKind;
  category: Exclude<DealCategory, "all">;
  country: "FR" | "EU";
  requiresFranceDelivery: true;
  reliability: number;
  selectors?: {
    item?: string;
    title?: string;
    url?: string;
    price?: string;
  };
}

export const LIVE_DEAL_SOURCES: LiveDealSource[] = [
  {
    id: "dealabs-hot-fr",
    name: "Dealabs Hot France",
    url: "https://www.dealabs.com/hot",
    kind: "html",
    category: "tech",
    country: "FR",
    requiresFranceDelivery: true,
    reliability: 94,
  },
  {
    id: "dealabs-new-fr",
    name: "Dealabs Nouveaux deals",
    url: "https://www.dealabs.com/new",
    kind: "html",
    category: "tech",
    country: "FR",
    requiresFranceDelivery: true,
    reliability: 88,
  },
  {
    id: "amazon-fr-deals",
    name: "Amazon FR offres du jour",
    url: "https://www.amazon.fr/gp/goldbox",
    kind: "html",
    category: "tech",
    country: "FR",
    requiresFranceDelivery: true,
    reliability: 86,
  },
  {
    id: "fnac-flash-fr",
    name: "Fnac ventes flash",
    url: "https://www.fnac.com/ventes-flash",
    kind: "html",
    category: "tech",
    country: "FR",
    requiresFranceDelivery: true,
    reliability: 82,
  },
  {
    id: "cdiscount-bons-plans-fr",
    name: "Cdiscount bons plans",
    url: "https://www.cdiscount.com/bons-plans.html",
    kind: "html",
    category: "home",
    country: "FR",
    requiresFranceDelivery: true,
    reliability: 78,
  },
];

export const FRANCE_DELIVERY_MARKERS = [
  ".fr",
  "france",
  "livraison france",
  "livraison gratuite",
  "expédié depuis france",
  "dealabs.com",
  "amazon.fr",
  "fnac.com",
  "cdiscount.com",
  "boulanger.com",
  "darty.com",
];
