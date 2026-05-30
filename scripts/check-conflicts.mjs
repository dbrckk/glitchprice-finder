import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CONFLICT_MARKERS = ["<<<<<<< ", "=======", ">>>>>>> ", "||||||| "];
const SKIPPED_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz"]);

function shouldSkip(path) {
  return path.startsWith("node_modules/") || path.startsWith("dist/") || path.startsWith("artifacts/") || [...SKIPPED_EXTENSIONS].some((extension) => path.endsWith(extension));
}

async function getTrackedFiles() {
  const { stdout } = await execFileAsync("git", ["ls-files"], { maxBuffer: 4 * 1024 * 1024 });
  return stdout.split("\n").filter(Boolean).filter((path) => !shouldSkip(path));
}

async function findConflictMarkers(path) {
  const content = await readFile(path, "utf8");
  return content
    .split("\n")
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => CONFLICT_MARKERS.some((marker) => line.startsWith(marker)));
}

const conflicts = [];
for (const path of await getTrackedFiles()) {
  try {
    const matches = await findConflictMarkers(path);
    conflicts.push(...matches.map((match) => `${path}:${match.lineNumber}: ${match.line}`));
  } catch (error) {
    conflicts.push(`${path}: unable to scan (${error instanceof Error ? error.message : String(error)})`);
  }
}

if (conflicts.length) {
  console.error("Git conflict markers detected:\n" + conflicts.join("\n"));
  process.exit(1);
}

console.log("No Git conflict markers detected.");
