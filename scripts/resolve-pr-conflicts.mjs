import { execFileSync, spawnSync } from "node:child_process";

const DEFAULT_BASE_BRANCH = "main";
const CONFLICT_POLICY_FILES = new Set([
  "README.md",
  "package-lock.json",
  "package.json",
  "src/App.tsx",
  "src/hooks/useDealTracker.ts",
  "src/types.ts",
  "src/utils/dealScoring.ts",
  "styles/index.css",
]);

function parseArgs(argv) {
  const args = { base: DEFAULT_BASE_BRANCH, remote: "origin", push: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
    if (arg === "--push") {
      args.push = true;
      continue;
    }
    if (arg.startsWith("--base=")) {
      args.base = arg.slice("--base=".length).trim() || DEFAULT_BASE_BRANCH;
      continue;
    }
    if (arg.startsWith("--remote=")) {
      args.remote = arg.slice("--remote=".length).trim() || "origin";
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/resolve-pr-conflicts.mjs [--base=main] [--remote=origin] [--push]\n\nFetches the target branch, merges it into the current branch, resolves known PR conflict files with the current branch versions, runs verification, and optionally pushes the merge commit.`);
}

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", stdio: options.stdio ?? "pipe" }).trim();
}

function hasGitConfig(key) {
  try {
    return Boolean(git(["config", "--get", key]));
  } catch {
    return false;
  }
}

function ensureGitIdentity() {
  if (!hasGitConfig("user.name")) {
    git(["config", "user.name", "glitchprice-merge-bot"], { stdio: "inherit" });
  }

  if (!hasGitConfig("user.email")) {
    git(["config", "user.email", "glitchprice-merge-bot@users.noreply.github.com"], { stdio: "inherit" });
  }
}

function run(command, args) {
  console.log(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}`);
  }
}

function assertCleanWorkingTree() {
  const status = git(["status", "--porcelain"]);
  if (status) {
    throw new Error(`Working tree must be clean before resolving PR conflicts:\n${status}`);
  }
}

function getCurrentBranch() {
  return git(["branch", "--show-current"]);
}

function getUnmergedFiles() {
  const output = git(["diff", "--name-only", "--diff-filter=U"]);
  return output ? output.split("\n").filter(Boolean) : [];
}

function resolveKnownConflicts() {
  const unmergedFiles = getUnmergedFiles();
  const unsupportedFiles = unmergedFiles.filter((file) => !CONFLICT_POLICY_FILES.has(file));

  if (unsupportedFiles.length) {
    throw new Error(`Unsupported conflict files require manual review:\n${unsupportedFiles.join("\n")}`);
  }

  for (const file of unmergedFiles) {
    console.log(`Resolving ${file} with the current branch version.`);
    git(["checkout", "--ours", "--", file], { stdio: "inherit" });
    git(["add", "--", file], { stdio: "inherit" });
  }

  return unmergedFiles.length;
}

const args = parseArgs(process.argv.slice(2));
assertCleanWorkingTree();

ensureGitIdentity();

const branch = getCurrentBranch();
if (!branch) {
  throw new Error("Cannot resolve PR conflicts from a detached HEAD.");
}

run("git", ["fetch", args.remote, args.base]);
const mergeResult = spawnSync("git", ["merge", "--no-edit", `${args.remote}/${args.base}`], { stdio: "inherit" });

if (mergeResult.status !== 0) {
  const resolvedCount = resolveKnownConflicts();
  if (!resolvedCount) {
    throw new Error("Merge failed but no supported unmerged files were found.");
  }
  run("git", ["commit", "--no-edit"]);
}

run("npm", ["run", "verify"]);

if (args.push) {
  run("git", ["push", args.remote, branch]);
}

console.log(`PR conflict resolution completed on ${branch}.`);
