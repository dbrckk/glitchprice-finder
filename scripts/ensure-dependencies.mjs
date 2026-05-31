import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";

const REQUIRED_PATHS = [
  "node_modules/.package-lock.json",
  "node_modules/.bin/tsc",
  "node_modules/.bin/vitest",
  "node_modules/.bin/vite",
];

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const missingPaths = [];
for (const dependencyPath of REQUIRED_PATHS) {
  if (!(await pathExists(dependencyPath))) {
    missingPaths.push(dependencyPath);
  }
}

if (!missingPaths.length) {
  process.exit(0);
}

console.log(`Missing local dependencies (${missingPaths.join(", ")}). Running npm ci before continuing...`);
execFileSync("npm", ["ci"], { stdio: "inherit" });
