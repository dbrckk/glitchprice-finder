# GlitchPrice Finder

Plateforme React/Vite pour centraliser les grosses promotions et erreurs de prix détectées sur Internet.

## Module actuel

- Dashboard de tracking avec scoring d'opportunité, métriques, alertes prioritaires, filtres avancés et export CSV.
- Simulation de scan multi-sources gratuite pour développer sans bloquer sur des APIs externes.
- Journal de scan local, watchlist persistante via `localStorage` et reset de démonstration.
- Sources publiques modélisées pour préparer une future couche de scraping open-source.
- Logique métier isolée dans des types, fixtures, hooks et utilitaires testés avec validation runtime pour brancher ensuite une API free-tier sans refondre l'UI.

## Commandes

```bash
npm install
npm run build
npm run typecheck
npm run test
npm run verify
npm run scan:live
```

## Configuration optionnelle

Copie `.env.example` vers `.env.local` si tu veux connecter un backend gratuit compatible avec les helpers `src/api/glitchApi.ts`. Sans configuration, le dashboard reste entièrement fonctionnel avec les données mockées locales.

## Scan live gratuit

`npm run scan:live` tente une collecte serveur Node sur des sources publiques compatibles France, applique un seuil de remise >= 35%, exige un signal de livraison France et écrit `artifacts/live-deals.json` et `artifacts/live-deals.csv`. Les erreurs réseau ou anti-bot sont reportées sans casser le pipeline local.

## Prochain branchement recommandé

Ajouter un backend serverless gratuit (Supabase Edge Functions, Firebase Functions free-tier ou Render free-tier si disponible) avec Playwright/Cheerio et stockage Supabase free-tier. Les données mockées du frontend peuvent être remplacées progressivement par une API sans changer le modèle métier principal.
