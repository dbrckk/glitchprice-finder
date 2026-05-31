# Merge readiness

This branch is prepared to merge cleanly from the repository side even when GitHub is strict about generated files and conflict markers:

- `npm run check:merge` fails on an unfinished merge/rebase/cherry-pick, unmerged index entries, `git diff --check` whitespace/conflict issues, or tracked conflict markers.
- `npm run verify` runs `check:merge`, production-file hygiene, real-feed validation, TypeScript, unit tests, production build and `npm audit` before merge.
- `scripts/check-real-feed.mjs` fails if the committed public live feed is invalid or contains non-France / low-discount entries.
- `.gitattributes` keeps generated lock/feed artifacts reviewable as text in GitHub and uses union merging for the CSV feed to reduce non-code conflicts without binary-only diffs.

If GitHub still reports a branch-level conflict after these checks pass, update the branch from the target branch and keep the code versions from this branch for the live scanner, tracker, services and workflows, then rerun `npm run verify`.

## Automated PR conflict resolution

When GitHub reports conflicts on the known project files (`README.md`, `package*.json`, `src/App.tsx`, `src/hooks/useDealTracker.ts`, `src/types.ts`, `src/utils/dealScoring.ts`, `styles/index.css`), run `npm run resolve:pr-conflicts -- --base=main --push` from a clone with `origin` configured or launch the manual `Resolve PR Conflicts` workflow. The resolver fetches the base branch, merges it, keeps the current branch implementation for those known conflict files, runs `npm run verify`, and pushes the merge commit only when requested.

`npm run check:prod-files` rejects tracked binaries, build folders, dependency folders and local-only files so GitHub does not receive non-production artifacts or binary-only review entries.
