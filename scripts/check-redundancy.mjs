#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const SRC_DIR = path.resolve("src");
const EXTENSIONS = new Set([".ts", ".tsx"]);
const MAX_FUNCTION_LINES = 24;
const MIN_BODY_LENGTH = 20;

function walk(dir) {
  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(fullPath);
  }

  return files;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function normalizeBody(body) {
  return stripComments(body)
    .replace(/\s+/g, " ")
    .replace(/\breturn\b/g, "return")
    .trim();
}

function lineNumber(source, index) {
  return source.slice(0, index).split("\n").length;
}

function isComponentName(name) {
  return /^[A-Z]/.test(name);
}

function extractFunctions(source, file) {
  const clean = stripComments(source);
  const results = [];

  const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
  let match;

  while ((match = functionPattern.exec(clean))) {
    const name = match[1];
    if (isComponentName(name)) continue;

    const open = clean.indexOf("{", match.index);
    const close = findMatchingBrace(clean, open);
    if (close < 0) continue;

    const startLine = lineNumber(source, match.index);
    const endLine = lineNumber(source, close);
    if (endLine - startLine + 1 > MAX_FUNCTION_LINES) continue;

    const body = normalizeBody(clean.slice(open + 1, close));
    if (body.length < MIN_BODY_LENGTH) continue;

    results.push({ file, name, startLine, endLine, body });
  }

  return results;
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = openIndex; i < source.length; i++) {
    const char = source[i];

    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return i;
  }

  return -1;
}

const files = walk(SRC_DIR);
const functions = files.flatMap((file) => {
  const source = fs.readFileSync(file, "utf8");
  return extractFunctions(source, path.relative(process.cwd(), file));
});

const groups = new Map();
for (const fn of functions) {
  const list = groups.get(fn.body) ?? [];
  list.push(fn);
  groups.set(fn.body, list);
}

const duplicates = [...groups.values()].filter((group) => group.length > 1);

console.log("\nArchitectural redundancy check");
console.log("--------------------------------");

if (duplicates.length === 0) {
  console.log("No duplicated helper logic found.");
  process.exit(0);
}

for (const group of duplicates) {
  console.log("⚠ Redundant helper logic:");
  for (const fn of group) {
    console.log(`  - ${fn.file}:${fn.startLine}-${fn.endLine} :: ${fn.name}`);
  }
  console.log(`    ${group[0].body}`);
  console.log("");
}

console.log(`${duplicates.length} duplicated helper pattern(s) found.`);
console.log("Review these before creating new utilities or refactoring existing ones.");

// Inspection only: do not fail npm run duplicates.
process.exit(0);
