import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CONFLICT_MARKERS = ["<<<<<<< ", "=======", ">>>>>>> ", "||||||| "];
const SKIPPED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz"]);
const MERGE_STATE_FILES = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD"];
const REBASE_STATE_DIRS = ["rebase-apply", "rebase-merge"];

function shouldSkip(filePath) {
  return filePath.startsWith("node_modules/") || filePath.startsWith("dist/") || filePath.startsWith("artifacts/") || [...SKIPPED_EXTENSIONS].some((extension) => filePath.endsWith(extension));
}

async function execGit(args, options = {}) {
  return execFileAsync("git", args, { maxBuffer: 8 * 1024 * 1024, ...options });
}

async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function getGitDir() {
  const { stdout } = await execGit(["rev-parse", "--git-dir"]);
  const gitDir = stdout.trim();
  return path.isAbsolute(gitDir) ? gitDir : path.resolve(gitDir);
}

async function getTrackedFiles() {
  const { stdout } = await execGit(["ls-files", "-z"]);
  return stdout.split("\0").filter(Boolean).filter((filePath) => !shouldSkip(filePath));
}

async function getUnmergedEntries() {
  const { stdout } = await execGit(["ls-files", "-u"]);
  return stdout.split("\n").filter(Boolean);
}

async function getGitStateIssues(gitDir) {
  const issues = [];

  for (const stateFile of MERGE_STATE_FILES) {
    if (await pathExists(path.join(gitDir, stateFile))) {
      issues.push(`Git operation still in progress: ${stateFile} exists.`);
    }
  }

  for (const stateDirectory of REBASE_STATE_DIRS) {
    if (await pathExists(path.join(gitDir, stateDirectory))) {
      issues.push(`Git operation still in progress: ${stateDirectory} exists.`);
    }
  }

  const unmergedEntries = await getUnmergedEntries();
  if (unmergedEntries.length) {
    issues.push(`Unmerged index entries detected:\n${unmergedEntries.join("\n")}`);
  }

  return issues;
}

async function getWhitespaceIssues() {
  try {
    await execGit(["diff", "--check"]);
    return [];
  } catch (error) {
    const stderr = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);
    return [`Whitespace/conflict diff issues detected by git diff --check:\n${stderr.trim()}`];
  }
}

async function findConflictMarkers(filePath) {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => CONFLICT_MARKERS.some((marker) => line.startsWith(marker)));
}

const issues = [];
const gitDir = await getGitDir();
issues.push(...(await getGitStateIssues(gitDir)));
issues.push(...(await getWhitespaceIssues()));

for (const filePath of await getTrackedFiles()) {
  if (!(await pathExists(filePath))) {
    continue;
  }

  try {
    const matches = await findConflictMarkers(filePath);
    issues.push(...matches.map((match) => `${filePath}:${match.lineNumber}: ${match.line}`));
  } catch (error) {
    issues.push(`${filePath}: unable to scan (${error instanceof Error ? error.message : String(error)})`);
  }
}

if (issues.length) {
  console.error("Git merge/conflict readiness check failed:\n" + issues.join("\n"));
  process.exit(1);
}

console.log("No merge state, unmerged entries, whitespace errors or conflict markers detected.");
