#!/usr/bin/env node
// docs/FRONTEND_PRODUCT_SYSTEM.md §66: scan customer-facing routes/components
// for internal implementation terminology that must never reach product copy.
// Allow-listed: docs/, src/lib (domain code, not rendered text), src/app/api
// (route handlers, not customer-facing prose), tests/.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const SCAN_DIRS = ["src/app", "src/components"];
const EXCLUDE_DIR_PARTS = ["node_modules", ".next", "src/app/api"];
const FILE_EXTENSIONS = [".tsx", ".ts"];

// Case-insensitive; word-ish patterns kept as substrings since some are
// multi-word phrases ("V1 scaffold") that wouldn't match a \b word boundary.
const BLOCKED_PATTERNS = [
  "needs_confirmation",
  "snapshot revalidation",
  "snapshot",
  "normalized to UTC",
  "PRD",
  "V1 scaffold",
  "unit tested",
  "real code",
  "API surface",
  "retry count",
  "retry ceiling",
  "Netlify",
  "Docker",
  "OpenNext",
  "constraint solver",
  "scheduling engine",
  "algorithm version",
  "score weight",
  "participant_roles",
  "calendar_busy_intervals",
  "webhook",
  // "KDM" was here until docs/KDM_AVAILABILITY_ADDENDUM.md made it a real,
  // spelled-out product concept (see docs/FRONTEND_PRODUCT_SYSTEM.md §7's
  // amendment) — it now belongs in customer-facing copy, not this list.
  "hard constraint",
  "soft constraint",
  "evaluated deterministically",
];

function shouldSkipDir(path) {
  const rel = relative(ROOT, path);
  return EXCLUDE_DIR_PARTS.some((part) => rel === part || rel.startsWith(`${part}/`) || rel.startsWith(`${part}\\`));
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!shouldSkipDir(full)) walk(full, files);
    } else if (FILE_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

let violations = [];

for (const dir of SCAN_DIRS) {
  const abs = join(ROOT, dir);
  let files;
  try {
    files = walk(abs);
  } catch {
    continue; // dir doesn't exist yet
  }

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    // §65 explicitly wants engineering guardrail comments that may reference
    // internal terms — only rendered copy (JSX text/strings) is in scope, so
    // strip block and line comments before scanning.
    const withoutBlockComments = raw.replace(/\/\*[\s\S]*?\*\//g, (match) =>
      match.replace(/[^\n]/g, " "),
    );
    const lines = withoutBlockComments.split("\n").map((line) => {
      const idx = line.indexOf("//");
      return idx === -1 ? line : line.slice(0, idx);
    });
    lines.forEach((line, i) => {
      for (const pattern of BLOCKED_PATTERNS) {
        if (line.toLowerCase().includes(pattern.toLowerCase())) {
          violations.push({ file: relative(ROOT, file), line: i + 1, pattern: pattern.trim(), text: line.trim() });
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error(`\n✗ Product-copy lint failed — ${violations.length} forbidden term(s) found in customer-facing UI:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.pattern}]  ${v.text}`);
  }
  console.error(`\nSee docs/FRONTEND_PRODUCT_SYSTEM.md §4 and §66.\n`);
  process.exit(1);
} else {
  console.log("✓ Product-copy lint passed — no forbidden implementation terminology found in customer-facing UI.");
}
