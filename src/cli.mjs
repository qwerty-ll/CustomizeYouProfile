#!/usr/bin/env node
// Generates the chosen effects for a GitHub user and (optionally) wires them
// into a README between marker comments.
//
//   GITHUB_TOKEN=... node src/cli.mjs --login octocat --effects intro,dino-run,skills \
//     --out profile-effects --readme README.md --name "Mona" --tagline "Builds things|Loves cats" \
//     --skills "TypeScript,Go,Figma" --language en

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { buildContext, fetchAvatar, fetchProfile } from "./lib.mjs";
import { ReadmeMarkerError, updateReadme } from "./readme.mjs";
import { EFFECTS, REMOVED, resolveEffects } from "./registry.mjs";
import { readmeBlock, renderEffect } from "./render.mjs";
import { resolveSettings } from "./settings.mjs";

export { EFFECTS };

let values;
try {
  ({ values } = parseArgs({ options: {
    login: { type: "string" },
    effects: { type: "string", default: "all" },
    out: { type: "string", default: "profile-effects" },
    readme: { type: "string", default: "README.md" },
    "readme-position": { type: "string", default: "top" },
    "no-readme": { type: "boolean", default: false },
    language: { type: "string", default: "en" },
    name: { type: "string", default: "" },
    tagline: { type: "string", default: "" },
    skills: { type: "string", default: "" },
    seasons: { type: "string", default: "" },
    birthday: { type: "string", default: "" },
    countdown: { type: "string", default: "" },
    today: { type: "string", default: "" },
    style: { type: "string", default: "clean" },
  } }));
} catch (err) {
  fail(err.message);
}

const login = values.login ?? process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN ?? process.env.INPUT_TOKEN;
if (!login) fail("no GitHub login: pass --login or set GITHUB_REPOSITORY_OWNER");
if (!token && !process.env.CALENDAR_CACHE) fail("no token: set GITHUB_TOKEN");
if (!values.out.trim()) fail("output-dir is empty");
if (!values["no-readme"] && !values.readme.trim()) fail("readme is empty (set update-readme: false to leave the README alone)");
const position = values["readme-position"].trim().toLowerCase();
if (!["top", "bottom"].includes(position)) fail(`readme-position "${values["readme-position"]}" should be top or bottom`);

// Text inputs are drawn into public images. If one holds a token (GitHub expands
// ${{ … }} in `with:` values, so a stray ${{ github.token }} would), stop here.
const TOKEN_LIKE = /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/;
for (const key of ["name", "tagline", "skills", "countdown"]) {
  const v = values[key];
  if (TOKEN_LIKE.test(v) || (token && token.length >= 20 && v.includes(token)))
    fail(`the ${key} input looks like it contains a token; it would be published in the image, so nothing was generated`);
}

// Inputs → options + today's (opt-in) modes, then the effect list.
let settings, selected;
try {
  settings = resolveSettings(values);
  const resolved = resolveEffects(values.effects, settings.modes);
  selected = resolved.selected;
  for (const w of resolved.warnings) console.warn(`::warning::CustomizeYouProfile: ${w}`);
} catch (err) {
  fail(err.message);
}
const { options, modes } = settings;

let ctx;
try {
  ctx = buildContext(login, await fetchProfile(login, token));
} catch (err) {
  fail(err.message);
}
console.log(`${login}: ${ctx.total} contributions, busiest day ${ctx.maxCount}, ${ctx.days.filter((d) => d.count).length} active days`);
if (selected.some((id) => EFFECTS[id].avatar)) options.avatar = await fetchAvatar(ctx.profile.avatarUrl);

const active = [modes.newYear && "new-year", modes.halloween && "halloween", modes.birthday && "birthday"].filter(Boolean);
if (active.length || modes.countdowns.length)
  console.log(`modes: ${[...active, ...modes.countdowns.map((c) => `countdown "${c.label}" ${c.days}d`)].join(", ")}`);

await mkdir(values.out, { recursive: true });
for (const id of REMOVED)
  for (const file of [`${id}.svg`, `${id}-dark.svg`]) await rm(join(values.out, file), { force: true });
const produced = [];
for (const id of selected) {
  const started = Date.now();
  const files = await renderEffect(id, ctx, options);
  for (const f of files) {
    await writeFile(join(values.out, f.file), f.svg);
    console.log(`  ${id.padEnd(14)} ${f.file.padEnd(26)} ${(f.svg.length / 1024).toFixed(0).padStart(4)} KB  ${Date.now() - started} ms`);
  }
  produced.push({ id, files: files.map((f) => f.file) });
}

if (!values["no-readme"]) {
  // Match an existing readme.md / Readme.md too: Linux runners are case-sensitive,
  // and writing README.md next to readme.md would leave two files.
  let readmePath = values.readme;
  try {
    const dir = dirname(readmePath) || ".", want = basename(readmePath), names = await readdir(dir);
    const hit = names.includes(want) ? want : names.find((f) => f.toLowerCase() === want.toLowerCase());
    if (hit) readmePath = join(dir, hit);
  } catch {}
  const base = relative(dirname(readmePath), values.out).split("\\").join("/") || ".";
  const block = readmeBlock(produced, base);
  let current = null;
  try { current = await readFile(readmePath, "utf8"); } catch {}
  let next = current, skipped = false;
  try {
    next = updateReadme(current, block, position);
  } catch (err) {
    if (!(err instanceof ReadmeMarkerError)) throw err;
    console.warn(`::warning::CustomizeYouProfile: ${readmePath}: ${err.message}`);
    skipped = true;
  }
  if (skipped) console.log(`${readmePath} left untouched (images were still updated)`);
  else if (next !== current) {
    await mkdir(dirname(readmePath) || ".", { recursive: true });
    await writeFile(readmePath, next);
    console.log(`${current === null ? "created" : "updated"} ${readmePath}`);
  } else console.log(`${readmePath} already up to date`);
}

function fail(msg) {
  console.error(`CustomizeYouProfile: ${msg}`);
  process.exit(1);
}
