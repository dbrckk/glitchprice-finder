import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".csv",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);
const TEXT_FILENAMES = new Set([".env.example", ".gitattributes", ".gitignore"]);
const INVISIBLE_CHARACTERS = [
  { value: "\u00a0", label: "NO-BREAK SPACE" },
  { value: "\u200b", label: "ZERO WIDTH SPACE" },
  { value: "\u200c", label: "ZERO WIDTH NON-JOINER" },
  { value: "\u200d", label: "ZERO WIDTH JOINER" },
  { value: "\ufeff", label: "BYTE ORDER MARK" },
];
const LEGACY_OR_PLACEHOLDER_FILES = new Set(["force-redeploy.txt", "src/hooks/useGlitchItems.ts"]);

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }).trim();
}

function getTrackedFiles() {
  const output = git(["ls-files", "-z"]);
  return output ? output.split("\0").filter(Boolean) : [];
}

function isTextFile(path) {
  const extension = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
  return TEXT_EXTENSIONS.has(extension) || TEXT_FILENAMES.has(path.split("/").at(-1) ?? "");
}

function lineAndColumn(text, index) {
  const before = text.slice(0, index);
  const line = before.split("\n").length;
  const lastBreak = before.lastIndexOf("\n");
  return { line, column: index - lastBreak };
}

const issues = [];
for (const path of getTrackedFiles()) {
  if (LEGACY_OR_PLACEHOLDER_FILES.has(path)) {
    issues.push(`${path}: legacy placeholder file must not be tracked.`);
  }

  if (!isTextFile(path)) {
    continue;
  }

  const data = readFileSync(path);
  if (data.length && data.at(-1) !== 10) {
    issues.push(`${path}: missing final newline.`);
  }

  let text = "";
  try {
    text = data.toString("utf8");
  } catch (error) {
    issues.push(`${path}: invalid UTF-8 (${error instanceof Error ? error.message : String(error)}).`);
    continue;
  }

  if (text.includes("\r")) {
    issues.push(`${path}: CRLF/CR line endings are not allowed.`);
  }

  text.split("\n").forEach((line, index) => {
    if (/[\t ]+$/.test(line)) {
      issues.push(`${path}:${index + 1}: trailing whitespace.`);
    }
  });

  for (const invisible of INVISIBLE_CHARACTERS) {
    const index = text.indexOf(invisible.value);
    if (index !== -1) {
      const location = lineAndColumn(text, index);
      issues.push(`${path}:${location.line}:${location.column}: invisible character ${invisible.label} is not allowed.`);
    }
  }

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    const char = text[index];
    if (code < 32 && char !== "\n" && char !== "\t") {
      const location = lineAndColumn(text, index);
      issues.push(`${path}:${location.line}:${location.column}: control character U+${code.toString(16).padStart(4, "0")} is not allowed.`);
      break;
    }
  }
}

if (issues.length) {
  console.error(`Code hygiene check failed:\n${issues.join("\n")}`);
  process.exit(1);
}

console.log("No legacy placeholders, invisible characters, CRLF endings or trailing whitespace detected.");
