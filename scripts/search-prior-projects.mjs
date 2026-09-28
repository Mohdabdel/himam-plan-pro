import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const USER_HOME = process.env.USERPROFILE ?? process.env.HOME ?? "";
const DEFAULT_ROOTS = [
  resolve(USER_HOME, "Documents", "Codex"),
  resolve(process.cwd(), ".."),
].filter(Boolean);

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".html",
  ".css",
  ".mjs",
  ".cjs",
]);

const SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".tanstack",
  "dist",
  "build",
  "node_modules",
  ".cache",
  "coverage",
]);

const SKIP_FILES = new Set([
  "bun.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

function usage() {
  console.log(`Usage:
  npm run search:prior -- "جودة الهدف" "خط الأساس"
  node scripts/search-prior-projects.mjs --root "C:\\path\\to\\project" --limit 80 "Goal Studio"

Options:
  --root <path>     Add a root directory to search. Can be repeated.
  --limit <number>  Maximum number of matches to print. Default: 60.
  --context <n>     Number of words around each match. Default: 18.
`);
}

function parseArgs(argv) {
  const roots = [];
  const terms = [];
  let limit = 60;
  let contextWords = 18;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    if (arg === "--root") {
      const root = argv[i + 1];
      if (!root) throw new Error("--root requires a path.");
      roots.push(resolve(root));
      i += 1;
      continue;
    }
    if (arg === "--limit") {
      limit = Number(argv[i + 1] ?? limit);
      i += 1;
      continue;
    }
    if (arg === "--context") {
      contextWords = Number(argv[i + 1] ?? contextWords);
      i += 1;
      continue;
    }
    terms.push(arg);
  }

  if (terms.length === 0) {
    usage();
    process.exit(1);
  }

  return {
    roots: roots.length > 0 ? roots : DEFAULT_ROOTS,
    terms: terms.map((term) => term.trim()).filter(Boolean),
    limit: Number.isFinite(limit) && limit > 0 ? limit : 60,
    contextWords: Number.isFinite(contextWords) && contextWords >= 0 ? contextWords : 18,
  };
}

function extensionOf(filePath) {
  const dot = filePath.lastIndexOf(".");
  return dot === -1 ? "" : filePath.slice(dot).toLowerCase();
}

function* walk(root) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(path);
      continue;
    }
    if (!entry.isFile()) continue;
    if (SKIP_FILES.has(entry.name)) continue;
    if (!TEXT_EXTENSIONS.has(extensionOf(entry.name))) continue;
    yield path;
  }
}

function safeStat(path) {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function lineContext(line, term, contextWords) {
  const normalized = line.replace(/\s+/g, " ").trim();
  if (contextWords === 0) return normalized;
  const index = normalized.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return normalized.slice(0, 240);

  const before = normalized.slice(0, index).split(" ").slice(-contextWords).join(" ");
  const match = normalized.slice(index, index + term.length);
  const after = normalized.slice(index + term.length).split(" ").slice(0, contextWords).join(" ");
  return [before, `<<${match}>>`, after].filter(Boolean).join(" ");
}

function scoreMatch(filePath, line, terms) {
  const haystack = `${filePath}\n${line}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const lower = term.toLowerCase();
    if (haystack.includes(lower)) score += 10 + Math.min(term.length, 30);
  }
  if (/specs|outputs|docs|archive/i.test(filePath)) score += 5;
  if (/quality|rubric|goal|هدف|جودة|مصفوفة|انتقال/i.test(filePath)) score += 4;
  return score;
}

function search({ roots, terms, limit, contextWords }) {
  const matches = [];
  const visited = new Set();

  for (const root of roots) {
    const stat = safeStat(root);
    if (!stat?.isDirectory()) continue;

    for (const filePath of walk(root)) {
      const resolved = resolve(filePath);
      if (visited.has(resolved)) continue;
      visited.add(resolved);

      let content;
      try {
        content = readFileSync(resolved, "utf8");
      } catch {
        continue;
      }

      const lowerContent = content.toLowerCase();
      const hasAnyTerm = terms.some((term) => lowerContent.includes(term.toLowerCase()));
      if (!hasAnyTerm) continue;

      const lines = content.split(/\r?\n/);
      lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();
        const matchedTerms = terms.filter((term) => lowerLine.includes(term.toLowerCase()));
        if (matchedTerms.length === 0) return;
        matches.push({
          filePath: resolved,
          lineNumber: index + 1,
          score: scoreMatch(resolved, line, terms) + matchedTerms.length * 8,
          term: matchedTerms[0],
          context: lineContext(line, matchedTerms[0], contextWords),
        });
      });
    }
  }

  matches.sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath) || a.lineNumber - b.lineNumber);
  return matches.slice(0, limit);
}

const options = parseArgs(process.argv.slice(2));
const results = search(options);

console.log(`Prior project search`);
console.log(`Terms: ${options.terms.join(" | ")}`);
console.log(`Roots: ${options.roots.join(" ; ")}`);
console.log(`Matches: ${results.length}`);
console.log("");

for (const result of results) {
  const displayPath = relative(process.cwd(), result.filePath) || result.filePath;
  console.log(`${displayPath}:${result.lineNumber}`);
  console.log(`  ${result.context}`);
}
