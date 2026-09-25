#!/usr/bin/env node
// Generates the chosen effects for a GitHub user and (optionally) wires them
// into a README between marker comments.
//
//   GITHUB_TOKEN=... node src/cli.mjs --login octocat --effects intro,dino-run,skills \
//     --out profile-effects --readme README.md --name "Mona" --tagline "Builds things|Loves cats" \
//     --skills "TypeScript,Go,Figma" --language en

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { parseArgs } from "node:util";
import { buildContext, fetchAvatar, fetchProfile } from "./lib.mjs";
import { updateReadme } from "./readme.mjs";

// Order here is the order used for `all`.
export const EFFECTS = {
  "intro": { alt: "Animated intro banner" },
  "skills": { alt: "Tech stack" },
  "rpg-card": { alt: "GitHub stats as an RPG character card", avatar: true },
  "languages": { alt: "Top languages as an animated equalizer" },
  "dino-run": { alt: "A dino running through the year, jumping over commit-cacti" },
  "fireworks": { alt: "Fireworks for every month that end by drawing the contribution graph in the sky" },
  "black-hole": { alt: "A black hole swallows the contribution graph and a big bang rebuilds it" },
  "oscilloscope": { alt: "CRT oscilloscope tracing daily commits" },
  "terminal": { alt: "Terminal typing git log --stats" },
  "notebook": { alt: "Squared school notebook shaded in pencil" },
  "space-shooter": { alt: "A spaceship shooting down contributions, biggest first" },
};
// Effects that no longer exist: skipped with a warning (so old workflows keep
// working) and their leftover files are removed.
const REMOVED = ["solar-system"];

const { values } = parseArgs({
  options: {
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
  },
});

const login = values.login ?? process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN ?? process.env.INPUT_TOKEN;
if (!login) fail("no GitHub login: pass --login or set GITHUB_REPOSITORY_OWNER");
if (!token && !process.env.CALENDAR_CACHE) fail("no token: set GITHUB_TOKEN");

const requested = values.effects.trim().toLowerCase() === "all"
  ? Object.keys(EFFECTS)
  : values.effects.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
const removed = requested.filter((id) => REMOVED.includes(id));
if (removed.length) console.warn(`::warning::CustomizeYouProfile: ${removed.join(", ")} was removed from the library and is skipped; remove it from your workflow.`);
const unknown = requested.filter((id) => !EFFECTS[id] && !REMOVED.includes(id));
if (unknown.length) fail(`unknown effect(s): ${unknown.join(", ")}. Available: ${Object.keys(EFFECTS).join(", ")}`);
const selected = requested.filter((id) => EFFECTS[id]);
if (!selected.length) fail("no effects selected");
const language = values.language.toLowerCase().startsWith("ru") ? "ru" : "en";

let ctx;
try {
  ctx = buildContext(login, await fetchProfile(login, token));
} catch (err) {
  fail(err.message);
}
console.log(`${login}: ${ctx.total} contributions, busiest day ${ctx.maxCount}, ${ctx.days.filter((d) => d.count).length} active days`);

const options = {
  language,
  name: values.name.trim(),
  tagline: values.tagline.split("|").map((s) => s.trim()).filter(Boolean),
  skills: values.skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
  avatar: selected.some((id) => EFFECTS[id].avatar) ? await fetchAvatar(ctx.profile.avatarUrl) : null,
};

await mkdir(values.out, { recursive: true });
for (const id of REMOVED)
  for (const file of [`${id}.svg`, `${id}-dark.svg`]) await rm(join(values.out, file), { force: true });
const produced = [];
for (const id of selected) {
  const { default: render } = await import(`./effects/${id}.mjs`);
  const started = Date.now();
  const files = await render(ctx, options);
  for (const f of files) {
    await writeFile(join(values.out, f.file), f.svg);
    console.log(`  ${id.padEnd(14)} ${f.file.padEnd(26)} ${(f.svg.length / 1024).toFixed(0).padStart(4)} KB  ${Date.now() - started} ms`);
  }
  produced.push({ id, files: files.map((f) => f.file) });
}

if (!values["no-readme"]) {
  const readmePath = values.readme;
  const base = relative(dirname(readmePath), values.out).split("\\").join("/") || ".";
  const block = produced.map(({ id, files }) => {
    const { alt } = EFFECTS[id];
    const light = files.find((f) => !f.endsWith("-dark.svg"));
    const dark = files.find((f) => f.endsWith("-dark.svg"));
    return dark
      ? `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${base}/${dark}">\n  <img alt="${alt}" src="${base}/${light}" width="100%">\n</picture>`
      : `<img alt="${alt}" src="${base}/${light}" width="100%">`;
  }).join("\n\n");
  let current = null;
  try { current = await readFile(readmePath, "utf8"); } catch {}
  const next = updateReadme(current, block, values["readme-position"]);
  if (next !== current) {
    await mkdir(dirname(readmePath) || ".", { recursive: true });
    await writeFile(readmePath, next);
    console.log(`${current === null ? "created" : "updated"} ${readmePath}`);
  } else console.log(`${readmePath} already up to date`);
}

function fail(msg) {
  console.error(`CustomizeYouProfile: ${msg}`);
  process.exit(1);
}
