# Merge readiness

This branch is prepared to merge cleanly from the repository side:

- `npm run verify` runs conflict-marker detection, real-feed validation, TypeScript, unit tests, production build and `npm audit`.
- `scripts/check-conflicts.mjs` fails if any tracked file contains unresolved Git conflict markers.
- `scripts/check-real-feed.mjs` fails if the committed public live feed is invalid or contains non-France / low-discount entries.
- `.gitattributes` marks generated lock/feed artifacts as generated in GitHub review and uses union merging for the CSV feed to reduce non-code conflicts.

If GitHub still reports a branch-level conflict, update the branch from the target branch and keep the code versions from this branch for the live scanner, tracker, services and workflows, then rerun `npm run verify`.
