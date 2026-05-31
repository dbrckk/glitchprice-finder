# GlitchPrice Finder

Plateforme React/Vite pour centraliser les grosses promotions et erreurs de prix détectées sur Internet.

## Module actuel

- Dashboard de tracking avec scoring d'opportunité, métriques, alertes prioritaires, filtres avancés et export CSV.
- Chargement frontend du dernier artefact réel `public/live-deals.json`, généré par le scanner Node gratuit.
- Journal de chargement live, watchlist persistante via `localStorage` et nettoyage du cache local.
- Sources publiques modélisées pour préparer une future couche de scraping open-source.
- Logique métier isolée dans des types, hooks et utilitaires testés avec validation runtime pour brancher ensuite une API free-tier sans refondre l'UI.

## Commandes

```bash
npm install
npm run build
npm run typecheck
npm run test
npm run verify
npm run scan:live
npm run scan:live:public
npm run check:real-feed
npm run check:merge
npm run check:prod-files
npm run check:code-hygiene
npm run resolve:pr-conflicts -- --base=main --branch=<branche-pr> --push
```

`npm run check:prod-files` refuse les binaires, dossiers de build, dépendances et fichiers locaux non-production suivis par Git. `npm run check:code-hygiene` refuse les placeholders legacy, fins de ligne CRLF, espaces invisibles, caractères de contrôle et espaces finaux. Les scripts `build`, `typecheck`, `test` et `verify` relancent automatiquement `npm ci` si les dépendances locales nécessaires manquent, ce qui évite les erreurs de type `Cannot find module 'vitest'` sur un environnement fraîchement cloné.

## Configuration optionnelle

Copie `.env.example` vers `.env.local` si tu veux connecter un backend gratuit compatible avec les helpers `src/api/glitchApi.ts`. Sans configuration, le dashboard charge le dernier artefact réel généré dans `public/live-deals.json`.

## Scan live gratuit

`npm run scan:live` tente une collecte serveur Node sur des sources publiques compatibles France, applique un seuil de remise >= 35%, exige un signal de livraison France, déduplique/classe les candidats par `qualityScore` et écrit `artifacts/live-deals.json` et `artifacts/live-deals.csv`. `npm run scan:live:public` écrit le même flux réel dans `public/live-deals.json` pour le dashboard Vite. Les erreurs réseau ou anti-bot sont reportées sans casser le pipeline local.

Options utiles : `npm run scan:live -- --min-discount=45 --max-results=20 --timeout-ms=12000` pour durcir le seuil, limiter les résultats et ajuster le timeout sans service payant.

## Automatisation live

Le workflow GitHub Actions `Refresh Live Deals` exécute `npm run scan:live:public` toutes les deux heures et sur demande manuelle, valide le flux réel avec `npm run check:real-feed`, puis commit automatiquement `public/live-deals.json` et `public/live-deals.csv` si les deals ont changé.

## Prochain branchement recommandé

Ajouter un backend serverless gratuit (Supabase Edge Functions, Firebase Functions free-tier ou Render free-tier si disponible) avec Playwright/Cheerio et stockage Supabase free-tier. Le flux public peut être remplacé progressivement par une API sans changer le modèle métier principal.

## Merge GitHub

Avant de mettre à jour la branche sur GitHub, lance `npm run check:merge` puis `npm run verify`. Si GitHub affiche encore des conflits sur la PR, utilise `npm run resolve:pr-conflicts -- --base=main --branch=<branche-pr> --push` depuis une copie avec le remote `origin`, ou lance le workflow manuel `Resolve PR Conflicts`. Le dépôt inclut aussi `.gitattributes` pour réduire les conflits sur les artefacts générés (`public/live-deals.*`, `package-lock.json`) sans masquer ces fichiers en diff binaire et `docs/merge-readiness.md` résume la procédure de résolution si GitHub signale encore un conflit de branche.
