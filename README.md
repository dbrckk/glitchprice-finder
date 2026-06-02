# GlitchPrice Finder

Plateforme React/Vite pour centraliser les grosses promotions et erreurs de prix détectées sur Internet.

## Module actuel

- Dashboard de tracking avec scoring d'opportunité, métriques globales et filtres par catégorie.
- Scraping réel Dealabs + Amazon Goldbox direct + flux marchands Amazon, Cdiscount, Fnac avec filtre 70%+ basé uniquement sur remises explicites, comparaisons de prix réelles, gratuits ou signaux textuels d’erreur de prix.
- Watchlist persistante via `localStorage` en attendant le branchement d'une base free-tier.
- Vérification à la demande des liens détectés, cache navigateur des derniers deals scrapés et fallback RSS si une page HTML est temporairement indisponible.

## Commandes

```bash
npm install
npm run verify
npm run build
npm run typecheck
```

## Qualité et sécurité GitHub

Le script `npm run verify` enchaine la vérification des marqueurs de conflit Git, des chemins incompatibles GitHub Actions/Windows, des caractères de contrôle interdits, du typage TypeScript, du build Vite et de `npm audit --audit-level=moderate`.

## Prochain branchement recommandé

Ajouter un backend serverless gratuit (Supabase Edge Functions, Firebase Functions free-tier ou Render free-tier si disponible) avec Playwright/Cheerio et stockage Supabase free-tier. La couche de scraping frontend peut être complétée par un backend serverless avec Playwright/Cheerio pour enrichir les prix de référence et multiplier les marchands sans changer le modèle métier principal.
