import { execFileSync, spawnSync } from "node:child_process";

const DEFAULT_BASE_REF = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : "origin/main";

function parseArgs(argv) {
  const args = { base: DEFAULT_BASE_REF, fetch: true };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--no-fetch") {
      args.fetch = false;
      continue;
    }
    if (arg.startsWith("--base=")) {
      args.base = arg.slice("--base=".length).trim() || DEFAULT_BASE_REF;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log("Usage: node scripts/check-github-mergeable.mjs [--base=origin/main] [--no-fetch]\n\nFetches the GitHub target branch, then checks that current HEAD already contains it or can merge with it without file conflicts.");
}

function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function refExists(ref) {
  try {
    git(["rev-parse", "--verify", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function remoteExists(remote) {
  try {
    git(["remote", "get-url", remote]);
    return true;
  } catch {
    return false;
  }
}

function maybeFetchBase(baseRef, shouldFetch) {
  if (!shouldFetch) {
    return;
  }

  const [remote, ...branchParts] = baseRef.split("/");
  const branch = branchParts.join("/");
  if (!remote || !branch || !remoteExists(remote)) {
    return;
  }

  const remoteTrackingRef = `refs/remotes/${remote}/${branch}`;
  const result = spawnSync("git", ["fetch", remote, `${branch}:${remoteTrackingRef}`], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Unable to fetch ${baseRef} before mergeability check.`);
  }
}

function assertCleanIndex() {
  const status = git(["status", "--porcelain"]);
  if (status) {
    throw new Error(`Working tree must be clean before GitHub mergeability check:\n${status}`);
  }
}

function listConflictedFiles(baseRef) {
  const result = spawnSync("git", ["merge-tree", "--write-tree", "--name-only", "HEAD", baseRef], {
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 16 * 1024 * 1024,
  });

  if (result.status === 0) {
    return [];
  }

  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  return output ? output.split("\n").map((line) => line.trim()).filter(Boolean) : ["unknown conflict"];
}

const args = parseArgs(process.argv.slice(2));
assertCleanIndex();
maybeFetchBase(args.base, args.fetch);

if (!refExists(args.base)) {
  console.log(`GitHub mergeability check skipped: ${args.base} is not available locally.`);
  process.exit(0);
}

try {
  git(["merge-base", "--is-ancestor", args.base, "HEAD"]);
  console.log(`GitHub mergeability clean: ${args.base} is already contained in HEAD.`);
  process.exit(0);
} catch {
  // Continue with a synthetic merge check.
}

const conflicts = listConflictedFiles(args.base);
if (conflicts.length) {
  console.error(`GitHub mergeability check failed against ${args.base}:\n${conflicts.join("\n")}`);
  process.exit(1);
}

console.log(`GitHub mergeability clean: HEAD can merge with ${args.base} without conflicts.`);
