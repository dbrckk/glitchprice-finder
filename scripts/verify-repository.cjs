#!/usr/bin/env node
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const CONFLICT_MARKERS = [/^<<<<<<<(?: .*)?$/m, /^=======$/m, /^>>>>>>>(?: .*)?$/m];
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const FORBIDDEN_WINDOWS_CHARS = /[<>:"|?*]/;
const ALLOWED_CONTROL_CODES = new Set([9, 10, 13]);
const BINARY_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpg",
  ".jpeg",
  ".pdf",
  ".png",
  ".webp",
  ".woff",
  ".woff2",
]);

function gitFiles() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "buffer" })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

function assertSafePath(filePath, failures) {
  const segments = filePath.split(/[\\/]+/);
  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") {
      failures.push(`${filePath}: segment de chemin invalide "${segment}"`);
    }

    if (RESERVED_WINDOWS_NAMES.test(segment)) {
      failures.push(`${filePath}: nom reserve Windows/GitHub Actions: ${segment}`);
    }

    if (FORBIDDEN_WINDOWS_CHARS.test(segment)) {
      failures.push(`${filePath}: caractere interdit dans le chemin: ${segment}`);
    }

    if (/[\u0000-\u001f\u007f]/u.test(segment)) {
      failures.push(`${filePath}: caractere de controle interdit dans le chemin`);
    }
  }
}

function hasBinarySignature(filePath, buffer) {
  if (buffer.includes(0)) return true;
  const extension = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(extension);
}

function assertSafeContent(filePath, failures) {
  const buffer = readFileSync(filePath);
  if (hasBinarySignature(filePath, buffer)) return;

  const content = buffer.toString("utf8");
  if (content.charCodeAt(0) === 0xfeff) {
    failures.push(`${filePath}: BOM UTF-8 interdit en debut de fichier`);
  }

  for (const marker of CONFLICT_MARKERS) {
    if (marker.test(content)) {
      failures.push(`${filePath}: marqueur de conflit Git detecte (${marker.source})`);
    }
  }

  for (let index = 0; index < content.length; index += 1) {
    const code = content.charCodeAt(index);
    if (code < 32 || code === 127) {
      if (!ALLOWED_CONTROL_CODES.has(code)) {
        const line = content.slice(0, index).split("\n").length;
        failures.push(`${filePath}:${line}: caractere de controle interdit U+${code.toString(16).padStart(4, "0")}`);
      }
    }
  }
}

const failures = [];
for (const filePath of gitFiles()) {
  assertSafePath(filePath, failures);
  assertSafeContent(filePath, failures);
}

if (failures.length > 0) {
  console.error("Verification repo echouee:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Repository clean: aucun marqueur de conflit Git, chemin interdit, BOM ou caractere de controle interdit detecte.");
