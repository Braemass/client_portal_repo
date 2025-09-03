#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "components"]; // add more folders if needed

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/i.test(p)) out.push(p);
  }
  return out;
}

const files = TARGET_DIRS.flatMap((d) =>
  fs.existsSync(path.join(ROOT, d)) ? walk(path.join(ROOT, d)) : []
);

let changed = 0;

for (const file of files) {
  const orig = fs.readFileSync(file, "utf8");
  let text = orig;

  // 1) Nav tabs and exact links
  text = text.replace(/href=["']\/projects["']/g, 'href="/admin/projects"');
  text = text.replace(/href=["']\/clients["']/g, 'href="/admin/clients"');

  // 2) Template-string URLs: `/projects/${...}` → `/admin/projects/${...}`
  text = text.replace(/`\/projects\/\$\{/g, '`/admin/projects/${');
  text = text.replace(/`\/clients\/\$\{/g, '`/admin/clients/${');

  // 3) router.push / router.replace to projects or clients
  text = text.replace(/router\.push\(\s*`\/projects\//g, 'router.push(`/admin/projects/');
  text = text.replace(/router\.replace\(\s*`\/projects\//g, 'router.replace(`/admin/projects/');
  text = text.replace(/router\.push\(\s*`\/clients\//g, 'router.push(`/admin/clients/');
  text = text.replace(/router\.replace\(\s*`\/clients\//g, 'router.replace(`/admin/clients/');

  // 4) String literal navigations (single/double quotes)
  text = text.replace(/router\.push\(\s*['"]\/projects/g, 'router.push("/admin/projects');
  text = text.replace(/router\.replace\(\s*['"]\/projects/g, 'router.replace("/admin/projects');
  text = text.replace(/router\.push\(\s*['"]\/clients/g, 'router.push("/admin/clients');
  text = text.replace(/router\.replace\(\s*['"]\/clients/g, 'router.replace("/admin/clients');

  if (text !== orig) {
    fs.writeFileSync(file, text, "utf8");
    console.log("Patched:", path.relative(ROOT, file));
    changed++;
  }
}

console.log(`\nDone. Modified ${changed} file(s).`);
