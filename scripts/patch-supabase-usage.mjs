#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, "app");

const HOOK_IMPORT = `import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';`;
const REACT_IMPORT_BASE = `import { useState, useEffect, useMemo, useCallback, useRef } from 'react';`;
const USE_CLIENT = `'use client';`;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function needsClientDirective(text) {
  // Needs client if it uses react hooks or next/navigation hooks
  const usesHooks = /(useState|useEffect|useMemo|useCallback|useRef)\(/.test(text);
  const nextNav = /from\s+['"]next\/navigation['"]/.test(text);
  return usesHooks || nextNav;
}

function ensureUseClient(text) {
  if (!needsClientDirective(text)) return text;
  const hasDirective = /^\s*['"]use client['"]\s*;?/m.test(text);
  if (hasDirective) return text;

  // Only insert if file is NOT a layout.tsx or route handlers (keep those server)
  if (/app\/.*\/layout\.tsx$/.test(currentFile)) return text;

  return `${USE_CLIENT}\n\n${text}`;
}

function ensureReactImport(text) {
  // If file uses any hook but no React import for them, add one
  const uses =
    (/(useState)\(/.test(text) ? "useState," : "") +
    (/(useEffect)\(/.test(text) ? " useEffect," : "") +
    (/(useMemo)\(/.test(text) ? " useMemo," : "") +
    (/(useCallback)\(/.test(text) ? " useCallback," : "") +
    (/(useRef)\(/.test(text) ? " useRef," : "");

  if (!uses) return text;

  const alreadyImports =
    /from\s+['"]react['"]/.test(text) &&
    /(useState|useEffect|useMemo|useCallback|useRef)/.test(text.split("\n").filter(l => /from\s+['"]react['"]/.test(l)).join(" "));

  if (alreadyImports) return text;

  // Insert after first import block or after 'use client'
  const lines = text.split("\n");
  let insertAt = 0;
  if (lines[0].startsWith("'use client'") || lines[0].startsWith('"use client"')) {
    insertAt = 1;
    while (lines[insertAt]?.trim() === "") insertAt++;
  } else {
    // insert before first non-import line
    while (insertAt < lines.length && /^(\s*import|\s*)/.test(lines[insertAt])) insertAt++;
  }
  lines.splice(insertAt, 0, REACT_IMPORT_BASE);
  return lines.join("\n");
}

function ensureSupabaseHookImport(text) {
  if (!/supabase\./.test(text)) return text; // not using supabase
  if (/createBrowserClient\(/.test(text)) return text; // file already creates a client
  if (/from\s+['"]@supabase\//.test(text)) return text; // file imports supabase directly

  if (/useSupabaseSession\(/.test(text) && text.includes(HOOK_IMPORT)) return text;

  // add the hook import after imports
  const lines = text.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) lastImport = i;
  }
  if (lastImport >= 0) {
    lines.splice(lastImport + 1, 0, HOOK_IMPORT);
  } else {
    lines.unshift(HOOK_IMPORT);
  }
  return lines.join("\n");
}

function ensureSupabaseHookUsage(text) {
  if (!/supabase\./.test(text)) return text;
  if (/createBrowserClient\(/.test(text)) return text;
  if (/from\s+['"]@supabase\//.test(text)) return text;

  if (/useSupabaseSession\(/.test(text)) {
    // ensure it destructures supabase
    if (!/{\s*supabase\b/.test(text)) {
      // Try to upgrade an existing call
      return text.replace(
        /const\s+(\w+)\s*=\s*useSupabaseSession\(\)\s*;/,
        `const { supabase } = useSupabaseSession();`
      );
    }
    return text;
  }

  // Insert `const { supabase } = useSupabaseSession();` after the first function start
  let idx = text.search(/(export\s+default\s+function|function\s+\w+|const\s+\w+\s*=\s*\(.*\)\s*=>)\s*[\r\n]*\{/);
  if (idx === -1) return text; // give up if we can't find a component

  // Find the next newline after the opening brace
  const before = text.slice(0, idx);
  const after = text.slice(idx);
  const braceIdx = after.indexOf("{");
  if (braceIdx === -1) return text;
  const insertPos = idx + braceIdx + 1;

  return text.slice(0, insertPos) + `\n  const { supabase } = useSupabaseSession();\n` + text.slice(insertPos);
}

let changed = 0;
const files = walk(TARGET_DIR);

for (const f of files) {
  global.currentFile = f; // used in ensureUseClient
  let text = fs.readFileSync(f, "utf8");

  const original = text;
  text = ensureUseClient(text);
  text = ensureReactImport(text);
  text = ensureSupabaseHookImport(text);
  text = ensureSupabaseHookUsage(text);

  if (text !== original) {
    fs.writeFileSync(f, text, "utf8");
    console.log("Patched:", path.relative(ROOT, f));
    changed++;
  }
}

console.log(`\nDone. Modified ${changed} file(s).`);

