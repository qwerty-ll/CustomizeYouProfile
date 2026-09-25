// Builds the static configurator site: site/* plus the effect code from src/,
// with .mjs renamed to .js (and imports rewritten) so any static host serves
// them as JavaScript modules. Every import carries a build version, so after a
// deploy browsers never mix cached old modules with new ones.
//   node site/build.mjs [outDir=_site]

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = process.argv[2] ?? join(root, "_site");
const version = (process.env.GITHUB_SHA ?? Date.now().toString(36)).slice(0, 10);
const rewrite = (text) => text.replace(/\.mjs(["'`])/g, `.js?v=${version}$1`);

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function copyTree(from, to, skip = () => false) {
  for await (const file of walk(from)) {
    const rel = relative(from, file);
    if (skip(rel)) continue;
    const target = join(to, rel.replace(/\.mjs$/, ".js"));
    await mkdir(dirname(target), { recursive: true });
    if (/\.(mjs|js|html|css)$/.test(file)) await writeFile(target, rewrite(await readFile(file, "utf8")));
    else await cp(file, target);
  }
}

await rm(out, { recursive: true, force: true });
await copyTree(join(root, "site"), out, (rel) => rel === "build.mjs");
await copyTree(join(root, "src"), join(out, "src"), (rel) => rel === "cli.mjs");
await writeFile(join(out, ".nojekyll"), "");
console.log(`site built (v=${version}) -> ${relative(process.cwd(), out) || out}`);
