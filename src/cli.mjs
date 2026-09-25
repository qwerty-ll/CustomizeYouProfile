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
import { decorate } from "./decorate.mjs";
import { buildContext, fetchAvatar, fetchProfile, seedFor } from "./lib.mjs";
import { parseBirthday, parseCountdowns, parseSeasons, resolveModes } from "./seasonal.mjs";
import { ReadmeMarkerError, updateReadme } from "./readme.mjs";

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
  "countdown": { alt: "Countdown to upcoming dates" },
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
    seasons: { type: "string", default: "" },
    birthday: { type: "string", default: "" },
    countdown: { type: "string", default: "" },
    today: { type: "string", default: "" },
    style: { type: "string", default: "clean" },
  },
});

const login = values.login ?? process.env.GITHUB_REPOSITORY_OWNER;
const token = process.env.GITHUB_TOKEN ?? process.env.INPUT_TOKEN;
if (!login) fail("no GitHub login: pass --login or set GITHUB_REPOSITORY_OWNER");
if (!token && !process.env.CALENDAR_CACHE) fail("no token: set GITHUB_TOKEN");

// Opt-in seasonal / personal modes: all off unless the inputs are set.
let modes;
try {
  const birthday = parseBirthday(values.birthday);
  const today = values.today ? new Date(`${values.today}T12:00:00Z`) : new Date();
  if (Number.isNaN(today.getTime())) throw new Error(`today "${values.today}" should look like YYYY-MM-DD`);
  modes = resolveModes({
    today, birthday,
    seasons: parseSeasons(values.seasons),
    countdowns: parseCountdowns(values.countdown, birthday),
    language: values.language.toLowerCase().startsWith("ru") ? "ru" : "en",
  });
} catch (err) {
  fail(err.message);
}

const requested = values.effects.trim().toLowerCase() === "all"
  ? Object.keys(EFFECTS).filter((id) => id !== "countdown")
  : values.effects.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
// Setting a countdown is enough to show it: add the card after the intro if it isn't listed.
if (modes.countdowns.length && !requested.includes("countdown"))
  requested.splice(requested[0] === "intro" ? 1 : 0, 0, "countdown");
const removed = requested.filter((id) => REMOVED.includes(id));
if (removed.length) console.warn(`::warning::CustomizeYouProfile: ${removed.join(", ")} was removed from the library and is skipped; remove it from your workflow.`);
const unknown = requested.filter((id) => !EFFECTS[id] && !REMOVED.includes(id));
if (unknown.length) fail(`unknown effect(s): ${unknown.join(", ")}. Available: ${Object.keys(EFFECTS).join(", ")}`);
if (requested.includes("countdown") && !modes.countdowns.length)
  console.warn(`::warning::CustomizeYouProfile: countdown is listed but the countdown input is empty, so it is skipped.`);
const selected = requested.filter((id) => EFFECTS[id] && !(id === "countdown" && !modes.countdowns.length));
if (!selected.length) fail("no effects selected");
const language = values.language.toLowerCase().startsWith("ru") ? "ru" : "en";

let ctx;
try {
  ctx = buildContext(login, await fetchProfile(login, token));
} catch (err) {
  fail(err.message);
}
console.log(`${login}: ${ctx.total} contributions, busiest day ${ctx.maxCount}, ${ctx.days.filter((d) => d.count).length} active days`);

const style = values.style.trim().toLowerCase() || "clean";
if (!["clean", "neon"].includes(style)) fail(`style "${values.style}" should be clean or neon`);
const options = {
  style,
  language,
  name: values.name.trim(),
  tagline: values.tagline.split("|").map((s) => s.trim()).filter(Boolean),
  skills: values.skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
  avatar: selected.some((id) => EFFECTS[id].avatar) ? await fetchAvatar(ctx.profile.avatarUrl) : null,
  modes,
};
const active = [modes.newYear && "new-year", modes.halloween && "halloween", modes.birthday && "birthday"].filter(Boolean);
if (active.length || modes.countdowns.length)
  console.log(`modes: ${[...active, ...modes.countdowns.map((c) => `countdown "${c.label}" ${c.days}d`)].join(", ")}`);

await mkdir(values.out, { recursive: true });
for (const id of REMOVED)
  for (const file of [`${id}.svg`, `${id}-dark.svg`]) await rm(join(values.out, file), { force: true });
const produced = [];
for (const id of selected) {
  const { default: render } = await import(`./effects/${id}.mjs`);
  const started = Date.now();
  const files = await render(ctx, options);
  for (const f of files) {
    f.svg = decorate(f.svg, modes, seedFor(ctx.login, f.file.length * 7919));
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
    const dir = dirname(readmePath) || ".";
    const hit = (await readdir(dir)).find((f) => f.toLowerCase() === basename(readmePath).toLowerCase());
    if (hit) readmePath = join(dir, hit);
  } catch {}
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
  let next = current, skipped = false;
  try {
    next = updateReadme(current, block, values["readme-position"]);
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
