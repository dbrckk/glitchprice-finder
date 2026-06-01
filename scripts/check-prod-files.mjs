import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const FORBIDDEN_TRACKED_PREFIXES = ["node_modules/", "dist/", "artifacts/", ".cache/", "coverage/"];
const FORBIDDEN_TRACKED_SUFFIXES = [".DS_Store", ".log", ".tmp", ".local"];
const ALLOWED_BINARY_EXTENSIONS = new Set([]);
const BINARY_EXTENSION_PATTERN = /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tar|7z|mp4|mov|avi|woff2?|ttf|eot)$/i;

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }).trim();
}

function getTrackedFiles() {
  const output = git(["ls-files", "-z"]);
  return output ? output.split("\0").filter(Boolean) : [];
}

function looksBinary(path) {
  const buffer = readFileSync(path);
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  return sample.includes(0);
}

const issues = [];
for (const path of getTrackedFiles()) {
  if (FORBIDDEN_TRACKED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    issues.push(`${path}: generated/non-production directory must not be tracked.`);
  }

  if (FORBIDDEN_TRACKED_SUFFIXES.some((suffix) => path.endsWith(suffix))) {
    issues.push(`${path}: local-only file must not be tracked.`);
  }

  if (BINARY_EXTENSION_PATTERN.test(path) && !ALLOWED_BINARY_EXTENSIONS.has(path)) {
    issues.push(`${path}: binary asset is not allowed in this production repository.`);
    continue;
  }

  if (looksBinary(path) && !ALLOWED_BINARY_EXTENSIONS.has(path)) {
    issues.push(`${path}: binary content detected; keep committed files reviewable as text.`);
  }
}

if (issues.length) {
  console.error(`Production file hygiene check failed:\n${issues.join("\n")}`);
  process.exit(1);
}

console.log("No tracked binary, build artifact, dependency folder or local-only file detected.");
