# Merge readiness

This branch is prepared to merge cleanly from the repository side even when GitHub is strict about generated files and conflict markers:

- `npm run check:merge` fails on an unfinished merge/rebase/cherry-pick, unmerged index entries, `git diff --check` whitespace/conflict issues, or tracked conflict markers.
- `npm run verify` runs `check:merge`, `check:github-mergeable`, production-file hygiene, code hygiene, real-feed validation, TypeScript, unit tests, production build and `npm audit` before merge.
- `scripts/check-real-feed.mjs` fails if the committed public live feed is invalid or contains non-France / low-discount entries.
- `.gitattributes` keeps generated lock/feed artifacts reviewable as text in GitHub without automatic union merges that can corrupt JSON or source files.

`npm run check:github-mergeable` proves that the current `HEAD` already contains `origin/main` or that Git can merge `HEAD` with the target branch without conflicts. If GitHub still reports a branch-level conflict after these checks pass, fetch the latest target branch, merge it locally, keep the code versions from this branch for the live scanner, tracker, services and workflows, then rerun `npm run verify`.

## Automated PR conflict resolution

When GitHub reports conflicts on the known project files (`README.md`, `package*.json`, `src/App.tsx`, `src/hooks/useDealTracker.ts`, `src/types.ts`, `src/utils/dealScoring.ts`, `styles/index.css`), run `npm run resolve:pr-conflicts -- --base=main --branch=<pr-branch> --push` from a clone with `origin` configured or launch the manual `Resolve PR Conflicts` workflow. The resolver fetches the base branch, configures a deterministic merge author, works even from detached CI checkouts when `--branch` is provided, merges it, keeps the current branch implementation for those known conflict files, runs `npm run verify`, and pushes `HEAD:<branch>` only when requested.

`npm run check:prod-files` rejects tracked binaries, build folders, dependency folders and local-only files so GitHub does not receive non-production artifacts or binary-only review entries.

`npm run check:code-hygiene` rejects legacy placeholder files, CRLF endings, invisible Unicode characters, control characters and trailing whitespace before GitHub review.

## Persistent GitHub conflict files

GitHub has repeatedly reported conflicts on `README.md`, `package-lock.json`, `package.json`, `src/App.tsx`, `src/hooks/useDealTracker.ts`, `src/types.ts`, `src/utils/dealScoring.ts` and `styles/index.css`. These files must not use `merge=union`, because automatic union merges can concatenate JSON and duplicate React modules. Resolve by merging the target branch, keeping the production live-feed implementation for conflicted files, and running `npm run verify` before accepting the pull request.

## Lockfile conflict reduction

`npm run lock:sync` updates only the root metadata block in `package-lock.json` from `package.json`. It avoids regenerating the full dependency tree during conflict cleanup while keeping the lockfile aligned enough for `npm ci` and GitHub review.
