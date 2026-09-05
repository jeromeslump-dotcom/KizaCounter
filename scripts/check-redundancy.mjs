#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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

function normalizeBody(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isComponentName(name) {
  return /^[A-Z]/.test(name);
}

function getFunctionName(node) {
  if (ts.isFunctionDeclaration(node) && node.name) {
    return node.name.text;
  }

  if (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    node.parent &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name)
  ) {
    return node.parent.name.text;
  }

  return null;
}

function getBodyText(node, sourceFile) {
  if (!node.body) return "";

  if (ts.isBlock(node.body)) {
    return sourceFile.text.slice(node.body.pos + 1, node.body.end - 1);
  }

  return sourceFile.text.slice(node.body.pos, node.body.end);
}

function extractFunctions(source, file) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const results = [];

  function visit(node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      const name = getFunctionName(node);

      if (name && !isComponentName(name)) {
        const start = node.getStart(sourceFile);
        const end = node.end;
        const startLine = sourceFile.getLineAndCharacterOfPosition(start).line + 1;
        const endLine = sourceFile.getLineAndCharacterOfPosition(end).line + 1;
        const body = normalizeBody(getBodyText(node, sourceFile));

        if (
          endLine - startLine + 1 <= MAX_FUNCTION_LINES &&
          body.length >= MIN_BODY_LENGTH
        ) {
          results.push({ file, name, startLine, endLine, body });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
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
