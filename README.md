# GlitchPrice Finder

Plateforme React/Vite pour centraliser les grosses promotions et erreurs de prix détectées sur Internet.

## Module actuel

- Dashboard de tracking avec scoring d'opportunité, métriques globales et filtres par catégorie.
- Simulation de scan multi-sources gratuite pour développer sans bloquer sur des APIs externes.
- Watchlist persistante via `localStorage` en attendant le branchement d'une base free-tier.
- Sources publiques modélisées pour préparer une future couche de scraping open-source.

## Commandes

```bash
npm install
npm run build
npx tsc --noEmit
```

## Prochain branchement recommandé

Ajouter un backend serverless gratuit (Supabase Edge Functions, Firebase Functions free-tier ou Render free-tier si disponible) avec Playwright/Cheerio et stockage Supabase free-tier. Les données mockées du frontend peuvent être remplacées progressivement par une API sans changer le modèle métier principal.
