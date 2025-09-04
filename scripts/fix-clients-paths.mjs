#!/usr/bin/env node
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const TARGET_DIRS = ["app", "components"]; // add more dirs if needed

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

  // <Link href="/clients"> → /admin/clients (double & single quoted)
  text = text.replace(/href=["']\/clients["']/g, 'href="/admin/clients"');

  // Template strings: `/clients/${…}` → `/admin/clients/${…}`
  text = text.replace(/`\/clients\/\$\{/g, '`/admin/clients/${');

  // router.push / router.replace (double & single quoted)
  text = text.replace(/router\.push\(\s*["']\/clients/g, 'router.push("/admin/clients');
  text = text.replace(/router\.replace\(\s*["']\/clients/g, 'router.replace("/admin/clients');

  if (text !== orig) {
    fs.writeFileSync(file, text, "utf8");
    console.log("Patched:", path.relative(ROOT, file));
    changed++;
  }
}
console.log(`\nDone. Modified ${changed} file(s).`);
