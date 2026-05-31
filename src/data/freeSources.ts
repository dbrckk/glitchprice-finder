import { DealSource } from "../types";

export const FREE_SOURCES: DealSource[] = [
  {
    id: "dealabs-hot-fr",
    name: "Dealabs Hot France",
    url: "https://www.dealabs.com/hot",
    category: "tech",
    cadenceMinutes: 15,
    reliability: 94,
  },
  {
    id: "dealabs-new-fr",
    name: "Dealabs nouveaux deals",
    url: "https://www.dealabs.com/new",
    category: "tech",
    cadenceMinutes: 15,
    reliability: 88,
  },
  {
    id: "dealabs-price-error-fr",
    name: "Dealabs erreurs de prix",
    url: "https://www.dealabs.com/search?q=erreur%20prix",
    category: "tech",
    cadenceMinutes: 20,
    reliability: 90,
  },
  {
    id: "amazon-fr-deals",
    name: "Amazon FR offres du jour",
    url: "https://www.amazon.fr/gp/goldbox",
    category: "tech",
    cadenceMinutes: 30,
    reliability: 86,
  },
  {
    id: "fnac-flash-fr",
    name: "Fnac ventes flash",
    url: "https://www.fnac.com/ventes-flash",
    category: "tech",
    cadenceMinutes: 30,
    reliability: 82,
  },
  {
    id: "cdiscount-bons-plans-fr",
    name: "Cdiscount bons plans",
    url: "https://www.cdiscount.com/bons-plans.html",
    category: "home",
    cadenceMinutes: 30,
    reliability: 78,
  },
];
