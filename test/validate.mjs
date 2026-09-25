// Renders every effect for synthetic profiles (empty, light, heavy, odd) and
// checks the SVGs are well-formed, reasonably small and loop quickly.
//   node test/validate.mjs

import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { buildContext } from "../src/lib.mjs";
import { demoUser as fakeUser } from "../src/demo.mjs";
import { decorate } from "../src/decorate.mjs";
import { NOTE, ReadmeMarkerError, updateReadme, START, END } from "../src/readme.mjs";
import { parseBirthday, parseCountdowns, parseSeasons, resolveModes } from "../src/seasonal.mjs";

const PROFILES = [
  fakeUser({ login: "empty", activity: 0, peak: 1, langs: 0 }),
  fakeUser({ login: "light", activity: 0.1, peak: 40, seed: 2 }),
  fakeUser({ login: "heavy", activity: 0.97, peak: 400, langs: 9, seed: 3 }),
  fakeUser({ login: "a-very-long-login-name-xx", activity: 0.4, peak: 12, name: "Someone With A Really Quite Long Display Name", seed: 4 }),
];
const OFF = resolveModes({ today: new Date("2026-12-31T12:00:00Z") });   // nothing opted in
const ALL_ON = (language, today) => resolveModes({
  today: new Date(today), language, seasons: parseSeasons("all"), birthday: parseBirthday(today.slice(5, 10)),
  countdowns: parseCountdowns("2026-12-31 <Release> & co; birthday; 2020-01-01 Past", parseBirthday(today.slice(5, 10))),
});
const OPTIONS = [
  { language: "en", tagline: [], skills: [], modes: OFF, style: "clean" },
  { language: "en", tagline: [], skills: [], modes: OFF, style: "neon" },
  { language: "ru", name: "Макар", tagline: ["строка с <угловыми> & скобками", "x".repeat(120)], skills: ["React", "Node.js", "C#", "<script>"], modes: ALL_ON("ru", "2026-12-31T12:00:00Z"), style: "neon" },
  { language: "en", tagline: [], skills: [], modes: ALL_ON("en", "2026-10-31T12:00:00Z"), style: "clean" },
];

// Minimal XML checks: balanced tags and no duplicate attributes.
function checkXml(svg, where) {
  const stack = [];
  const tag = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;
  let m, last = 0;
  while ((m = tag.exec(svg))) {
    const between = svg.slice(last, m.index);
    assert.ok(!between.includes("<"), `${where}: stray "<" near ${JSON.stringify(between.slice(between.indexOf("<"), between.indexOf("<") + 60))}`);
    last = tag.lastIndex;
    const [, close, name, attrs, self] = m;
    const keys = [...attrs.matchAll(/([\w:-]+)="/g)].map((a) => a[1]);
    assert.equal(new Set(keys).size, keys.length, `${where}: duplicate attribute in <${name}${attrs.slice(0, 80)}…>`);
    if (close) assert.equal(stack.pop(), name, `${where}: unbalanced </${name}>`);
    else if (!self) stack.push(name);
  }
  assert.equal(stack.length, 0, `${where}: unclosed <${stack.at(-1)}>`);
}

const effects = (await readdir(new URL("../src/effects/", import.meta.url))).map((f) => f.replace(/\.mjs$/, ""));
let count = 0;
for (const user of PROFILES) {
  const ctx = buildContext(user.login, user);
  for (const options of OPTIONS) {
    for (const id of effects) {
      const { default: render } = await import(`../src/effects/${id}.mjs`);
      const files = await render(ctx, { ...options, avatar: null });
      assert.ok(files.length > 0, `${id} produced no files`);
      for (const f of files) f.svg = decorate(f.svg, options.modes, 1);
      for (const { file, svg } of files) {
        const where = `${id}/${file} for ${user.login} (${options.language}, ${options.style})`;
        assert.ok(!/<clipPath[^>]*>(?:(?!<\/clipPath>)[\s\S])*class="m/.test(svg), `${where}: animated clipPath (Safari won't play it)`);
        checkXml(svg, where);
        assert.ok(svg.length < 400 * 1024, `${where}: ${(svg.length / 1024).toFixed(0)} KB is too big`);
        const loop = svg.match(/animation-duration:([\d.]+)s/);
        if (loop) assert.ok(+loop[1] <= 45, `${where}: loop of ${loop[1]}s is too long`);
        assert.ok(!svg.includes("<script"), `${where}: unescaped user text`);
        assert.ok(!/NaN|undefined|Infinity/.test(svg), `${where}: NaN/undefined/Infinity in output`);
        count++;
      }
    }
  }
}

// Modes are strictly opt-in and date-bound
assert.equal(OFF.any, false);
assert.equal(OFF.newYear, false);
const ny = resolveModes({ today: new Date("2027-01-05T12:00:00Z"), seasons: ["new-year"] });
assert.ok(ny.newYear && !ny.halloween && ny.nyYear === 2027);
assert.ok(!resolveModes({ today: new Date("2026-07-01T12:00:00Z"), seasons: ["new-year", "halloween"] }).any);
assert.ok(resolveModes({ today: new Date("2026-10-30T12:00:00Z"), seasons: ["halloween"] }).halloween);
assert.deepEqual(parseBirthday("15.03"), { month: 3, day: 15 });
assert.deepEqual(parseBirthday("2001-03-15"), { month: 3, day: 15 });
assert.throws(() => parseBirthday("13-40"));
assert.throws(() => parseSeasons("xmas"));
assert.throws(() => parseCountdowns("tomorrow party"));
assert.throws(() => parseCountdowns("birthday"));
const cd = resolveModes({ today: new Date("2026-03-10T12:00:00Z"), birthday: { month: 3, day: 15 }, countdowns: parseCountdowns("birthday; 2026-03-10 Launch", { month: 3, day: 15 }) }).countdowns;
assert.equal(cd[0].days, 5);
assert.equal(cd[1].days, 0);
const wrap = resolveModes({ today: new Date("2026-03-20T12:00:00Z"), birthday: { month: 3, day: 15 }, countdowns: [{ birthday: true, label: null }] }).countdowns[0];
assert.ok(wrap.days > 300 && wrap.iso === "2027-03-15", "next birthday rolls over to next year");
assert.equal(decorate("<svg width=\"10\" height=\"10\"></svg>", OFF, 1), "<svg width=\"10\" height=\"10\"></svg>");

// Only plain raster data URIs are embedded as the avatar; text is escaped for attributes too
{
  const { esc, safeAvatar } = await import("../src/lib.mjs");
  assert.equal(esc(`<a href="x" title='y'>&`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;");
  assert.equal(safeAvatar("data:image/png;base64,iVBORw0KGgo="), "data:image/png;base64,iVBORw0KGgo=");
  for (const bad of ["data:image/svg+xml;base64,PHN2Zz4=", 'data:image/png" onload="x;base64,AA==', "https://x/a.png", "data:image/png;base64,AA==\"", null, 42])
    assert.equal(safeAvatar(bad), null, `rejects ${bad}`);
  const { default: rpg } = await import("../src/effects/rpg-card.mjs");
  const [card] = await rpg(buildContext(PROFILES[1].login, PROFILES[1]), { ...OPTIONS[0], avatar: 'data:image/png;base64,AA==" onload="x' });
  assert.ok(!card.svg.includes("onload") && !card.svg.includes("<image"), "unsafe avatar falls back to the initial");
}
// The CLI refuses to publish a token that ended up in a text input
{
  const { spawnSync } = await import("node:child_process");
  const cli = new URL("../src/cli.mjs", import.meta.url).pathname;
  const r = spawnSync(process.execPath, [cli, "--login", "x", "--no-readme", "--out", "/nonexistent", "--tagline", "hi ghs_" + "a".repeat(36)],
    { env: { ...process.env, GITHUB_TOKEN: "t" } });
  assert.equal(r.status, 1);
  assert.match(r.stderr.toString(), /looks like it contains a token/);
}

// README block handling
const b = "<img src=a.svg>";
assert.equal(updateReadme(null, b), `${START}\n${NOTE}\n${b}\n${END}\n`);
const mine = "# Hi\n\ntext\n";
const top = updateReadme(mine, b, "top");
assert.ok(top.startsWith(START) && top.endsWith(mine));
assert.ok(updateReadme(mine, b, "bottom").trimEnd().endsWith(END));
const again = updateReadme(top, "<img src=b.svg>");
assert.ok(again.includes("b.svg") && !again.includes("a.svg") && again.split(START).length === 2);
assert.equal(updateReadme(again, "<img src=b.svg>"), again, "second run is a no-op");
// damaged markers: never guess, never duplicate
assert.throws(() => updateReadme(`# Me\n${START}\n<img src=old.svg>\n`, b), ReadmeMarkerError);
assert.throws(() => updateReadme(`${END}\n# Me\n${START}\n`, b), ReadmeMarkerError);
assert.throws(() => updateReadme(`${START}\nx\n${END}\n${START}\ny\n${END}\n`, b), ReadmeMarkerError);
// the user's text around the block always survives
const custom = "# Mona\n\n[![badge](x)](y)\n\n<p align=center>hi</p>\n";
const placed = updateReadme(custom, b, "bottom");
assert.ok(placed.startsWith(custom.trimEnd()));
const moved = `# Mona\n\ntext\n\n${placed.slice(placed.indexOf(START))}\nfooter\n`;
const refreshed = updateReadme(moved, "<img src=c.svg>");
assert.ok(refreshed.startsWith("# Mona\n\ntext\n\n") && refreshed.trimEnd().endsWith("footer") && refreshed.includes("c.svg"));

// ---------- web configurator ----------
{
  const { toUser } = await import("../site/data.mjs");
  const { workflowYaml, installCommand, newWorkflowUrl } = await import("../site/output.mjs");
  // REST + contributions mirror → the same context the Action builds
  const contributions = Array.from({ length: 370 }, (_, i) => {
    const d = new Date(Date.UTC(2025, 8, 21) + i * 864e5);
    return { date: d.toISOString().slice(0, 10), count: i % 9 === 0 ? 5 : 0, level: i % 9 === 0 ? 2 : 0 };
  });
  const user = toUser(
    { login: "mona", name: "Mona", avatar_url: "https://avatars.githubusercontent.com/u/1", created_at: "2020-01-01T00:00:00Z", followers: 3, public_repos: 2 },
    [{ name: "a", fork: false, stargazers_count: 4, language: "Go", size: 10 }, { name: "b", fork: true, stargazers_count: 9, language: "C", size: 5 }],
    { total: { lastYear: 205 }, contributions }, 7);
  const c = buildContext("mona", user);
  assert.equal(c.days.length, 370);
  assert.ok(c.calendar.weeks.every((w) => w.contributionDays[0].weekday === 0 || w === c.calendar.weeks[0]), "weeks start on Sunday");
  assert.equal(c.profile.repos, 1, "forks are skipped");
  assert.equal(c.profile.stars, 4);
  assert.equal(c.profile.languages[0].name, "Go");
  // with byte counts for the big repos, those decide the ranking (like the Action)
  const withBytes = buildContext("mona", toUser({ login: "mona", followers: 0, public_repos: 2 },
    [{ name: "a", fork: false, language: "HTML", size: 1 }, { name: "b", fork: false, language: "HTML", size: 1 }, { name: "big", fork: false, language: "TypeScript", size: 900 }],
    { contributions }, 0, { big: { JavaScript: 90000, TypeScript: 30000 } }));
  assert.deepEqual(withBytes.profile.languages.map((l) => l.name), ["JavaScript", "TypeScript"]);
  assert.equal(c.profile.pullRequests, 7);
  for (const id of effects) (await (await import(`../src/effects/${id}.mjs`)).default(c, { ...OPTIONS[0], modes: OFF })).forEach((f) => checkXml(f.svg, `${id} from REST data`));
  // outputs keep every value intact and only list what was changed
  const tricky = `Ma"k \\ o'N $(echo hi) \`x\``;
  const cfg = { effects: ["intro", "dino-run"], style: "clean", language: "en", name: tricky, tagline: "a|b", skills: "", seasons: [], birthday: "", countdown: "", position: "top" };
  const yaml = workflowYaml(cfg);
  const nameLine = yaml.split("\n").find((l) => l.trim().startsWith("name: \""));
  assert.equal(JSON.parse(nameLine.trim().slice("name: ".length)), tricky, "YAML keeps the value exactly");
  assert.ok(!yaml.includes("style:") && !yaml.includes("skills:"), "defaults are left out");
  assert.ok(yaml.includes("uses: qwerty-ll/CustomizeYouProfile@v1") && yaml.includes("effects: intro, dino-run"));
  const { execFileSync: run } = await import("node:child_process");
  const probe = installCommand(cfg).replace(/bash <\(curl[^)]*\)/, `bash -c 'printf "%s" "$CYP_NAME"' _`);
  assert.equal(run("bash", ["-c", probe]).toString(), tricky, "shell command passes the value exactly, nothing is executed");
  // line breaks can't break the YAML, and ${{ … }} is never handed to GitHub to evaluate
  const sneaky = workflowYaml({ ...cfg, name: "a\n          token: x", tagline: "hi ${{ github.token }}" });
  assert.ok(!sneaky.includes("${{") && !/^\s+token:/m.test(sneaky), "no injected keys or expressions");
  assert.ok(!installCommand({ ...cfg, tagline: "${{ secrets.X }}" }).includes("${{"));
  // the third-party calendar mirror can't smuggle markup or NaN into the images
  const junk = toUser({ login: "mona", followers: 0, public_repos: 0 }, [],
    { total: { lastYear: "<x>" }, contributions: [{ date: "<svg onload=x>", count: 1, level: 1 }, { date: "2026-01-04", count: "7<b>", level: 99 }, null, { date: "2026-01-05", count: -3, level: "x" }] });
  const jc = buildContext("mona", junk);
  assert.deepEqual(jc.days.map((d) => [d.date, d.count, d.level]), [["2026-01-04", 0, 4], ["2026-01-05", 0, 0]]);
  assert.equal(jc.total, 0);
  assert.ok(newWorkflowUrl("mona", "main", yaml).startsWith("https://github.com/mona/mona/new/main?filename=.github%2Fworkflows%2Fprofile-effects.yml&value="));
  // no calendar: the profile stays real and the page draws in a sample year (as app.mjs does)
  const { seedFor } = await import("../src/lib.mjs");
  const sampleYear = (login) => fakeUser({ login, activity: 0.35, peak: 12, seed: seedFor(login, 365) }).contributionsCollection;
  const bare = toUser({ login: "mona", name: "Mona", followers: 3, public_repos: 1 }, [{ name: "a", fork: false, stargazers_count: 4, language: "Go" }]);
  assert.equal(bare.contributionsCollection.contributionCalendar.weeks.length, 0);
  const sc = buildContext("mona", { ...bare, contributionsCollection: sampleYear("mona") });
  assert.deepEqual([sc.profile.name, sc.profile.stars, sc.profile.languages[0].name, sc.weeks], ["Mona", 4, "Go", 53]);
  assert.ok(sc.calendar.weeks.every((w) => w.contributionDays[0].weekday === 0) && sc.total > 0, "a year of Sunday-first weeks");
  assert.deepEqual(sampleYear("Mona"), sampleYear("mona"), "the same sample for a login every time");
  assert.notDeepEqual(sampleYear("mona"), sampleYear("octocat"));
  for (const id of effects) (await (await import(`../src/effects/${id}.mjs`)).default(sc, { ...OPTIONS[0], modes: OFF })).forEach((f) => checkXml(f.svg, `${id} with a sample year`));
  // the lookup against stubbed APIs: however the calendar mirror fails, it still succeeds
  const { CALENDAR_API, LoadError, fetchPublicProfile } = await import("../site/data.mjs");
  const reply = (body, status = 200) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  const api = (calendar) => async (url) => {
    url = String(url);
    if (CALENDAR_API && url.startsWith(CALENDAR_API)) return calendar();
    if (url.endsWith("/users/mona")) return reply({ login: "mona", name: "Mona", avatar_url: "x", followers: 3, public_repos: 1 });
    if (url.includes("/users/mona/repos?")) return reply([{ name: "a", full_name: "mona/a", fork: false, stargazers_count: 4, language: "Go", size: 9 }]);
    if (url.includes("/search/issues?")) return reply({ total_count: 7 });
    if (url.endsWith("/repos/mona/a/languages")) return reply({ Shell: 100, Go: 900 });
    if (url.endsWith("/repos/mona/mona")) return reply({ default_branch: "trunk" });
    return reply({ message: "Not Found" }, 404);
  };
  const realFetch = globalThis.fetch;
  try {
    for (const calendar of [() => { throw new TypeError("Failed to fetch"); }, () => reply("", 502), () => reply("{not json"), () => reply({ contributions: "x" })]) {
      globalThis.fetch = api(calendar);
      const { user, repo, calendar: kind } = await fetchPublicProfile("mona");
      assert.equal(kind, "sample");
      assert.equal(user.contributionsCollection.contributionCalendar.weeks.length, 0, "no made-up days from the data layer");
      const ctx = buildContext(user.login, { ...user, contributionsCollection: sampleYear(user.login) });
      assert.deepEqual([ctx.profile.name, ctx.profile.stars, ctx.profile.pullRequests, ctx.profile.languages[0].name, repo.exists, repo.branch], ["Mona", 4, 7, "Go", true, "trunk"]);
    }
    if (CALENDAR_API) {
      globalThis.fetch = api(() => reply({ total: { lastYear: 205 }, contributions }));
      const live = await fetchPublicProfile("mona");
      assert.equal(live.calendar, "live");
      assert.equal(buildContext("mona", live.user).total, 205);
    }
    await assert.rejects(fetchPublicProfile("nobody"), (e) => e instanceof LoadError && e.kind === "notfound", "GitHub's own errors still count");
  } finally {
    globalThis.fetch = realFetch;
  }
  // every interface string exists in both languages
  const { STRINGS, EFFECT_TEXT_RU, MONTHS } = await import("../site/i18n.mjs");
  const { EFFECTS } = await import("../src/registry.mjs");
  assert.deepEqual(Object.keys(STRINGS.ru).sort(), Object.keys(STRINGS.en).sort(), "EN and RU have the same strings");
  for (const k in STRINGS.en) assert.equal(typeof STRINGS.ru[k], typeof STRINGS.en[k], `"${k}" is text in one language and a function in the other`);
  assert.deepEqual(Object.keys(EFFECT_TEXT_RU).sort(), Object.keys(EFFECTS).sort(), "every effect has Russian text");
  assert.ok(MONTHS.en.length === 12 && MONTHS.ru.length === 12);
}
// the built site must render exactly like src/
{
  const { mkdtemp, writeFile: wf } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const dir = await mkdtemp(join(tmpdir(), "cyp-site-"));
  execFileSync(process.execPath, [new URL("../site/build.mjs", import.meta.url).pathname, dir]);
  await wf(join(dir, "package.json"), '{"type":"module"}');
  const built = await import(join(dir, "src/render.js"));
  const direct = await import("../src/render.mjs");
  const ctx = buildContext(PROFILES[1].login, PROFILES[1]);
  for (const id of ["intro", "dino-run", "fireworks"]) {
    const a = await built.renderEffect(id, ctx, { ...OPTIONS[0], modes: OFF });
    const b = await direct.renderEffect(id, ctx, { ...OPTIONS[0], modes: OFF });
    assert.deepEqual(a.map((f) => f.svg), b.map((f) => f.svg), `built site renders ${id} differently`);
  }
}

// Emoji, accents and right-to-left text stay whole; XML-breaking characters are dropped
{
  const { cellWidth, clip, esc, graphemes } = await import("../src/lib.mjs");
  const { renderEffect } = await import("../src/render.mjs");
  assert.deepEqual(graphemes("👨‍💻 🇺🇦 ❤️ é"), ["👨‍💻", " ", "🇺🇦", " ", "❤️", " ", "é"]);
  assert.equal(clip("aaa😀x", 4), "aaa😀");
  assert.equal(cellWidth("日本 ok"), 7);
  assert.equal(esc("a\u0001b\ud83dc\u0007"), "abc", "control characters and lone surrogates are dropped");
  const ctx = buildContext(PROFILES[1].login, PROFILES[1]);
  for (const style of ["clean", "neon"]) {
    const [intro] = await renderEffect("intro", ctx, { ...OPTIONS[0], style, tagline: ["👨‍💻 Full-stack dev", "שלום עולם"], modes: OFF });
    checkXml(intro.svg, `${style} intro with emoji`);
    assert.ok(intro.svg.includes(">👨‍💻</text>"), `${style} intro types the emoji as one character`);
    assert.ok(intro.svg.includes(">שלום עולם</text>"), `${style} intro draws a right-to-left line in one piece`);
    const [skills] = await renderEffect("skills", ctx, { ...OPTIONS[0], style, skills: [`${"a".repeat(27)}😀x`], modes: OFF });
    assert.ok(skills.svg.includes(`${"a".repeat(27)}😀<`) && !skills.svg.includes("�"), `${style} skills cut the chip text between characters`);
  }
  const [card] = await renderEffect("rpg-card", buildContext("x", { ...PROFILES[1], name: "🦄 Mona" }), { ...OPTIONS[0], avatar: null, modes: OFF });
  assert.ok(card.svg.includes(">🦄</text>"), "the initial is a whole emoji");
}
// Dates must exist; a Feb 29 birthday is celebrated on Feb 28 in other years
{
  const { resolveSettings } = await import("../src/settings.mjs");
  assert.throws(() => parseCountdowns("2026-02-30 Launch"), /doesn't exist/);
  assert.throws(() => parseCountdowns("0099-01-01 Old"), /doesn't exist/);
  assert.throws(() => parseBirthday("04-31"));
  assert.throws(() => resolveSettings({ today: "2026-02-30" }), /real date/);
  const leap = (today) => resolveModes({ today: new Date(`${today}T12:00:00Z`), birthday: parseBirthday("02-29"), countdowns: [{ birthday: true, label: null }] });
  assert.ok(leap("2026-02-28").birthday && leap("2026-02-28").countdowns[0].days === 0);
  assert.ok(!leap("2026-03-01").birthday && leap("2026-03-01").countdowns[0].iso === "2027-02-28");
  assert.ok(leap("2028-02-29").birthday && !leap("2028-02-28").birthday);
}
// Transient GitHub API failures are retried; anything else fails at once
{
  const { fetchProfile } = await import("../src/lib.mjs");
  const { fetch: realFetch } = globalThis, { warn } = console, cache = process.env.CALENDAR_CACHE;
  const user = { login: "mona", contributionsCollection: {} };
  const reply = (status, body) => () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  const script = (...steps) => {
    let n = 0;
    globalThis.fetch = async () => { const step = steps[Math.min(n++, steps.length - 1)]; if (step instanceof Error) throw step; return step(); };
    return () => n;
  };
  const quick = { retryDelays: [0, 0] };
  console.warn = () => {};
  delete process.env.CALENDAR_CACHE;
  try {
    let calls = script(reply(502, { message: "Bad gateway" }), reply(200, { errors: [{ message: "Something went wrong while executing your query. This may be the result of a timeout" }] }), reply(200, { data: { user } }));
    assert.deepEqual(await fetchProfile("mona", "t", quick), user);
    assert.equal(calls(), 3);
    calls = script(new TypeError("fetch failed"), reply(200, '{"data":'), reply(200, { data: { user } }));
    assert.deepEqual(await fetchProfile("mona", "t", quick), user);
    assert.equal(calls(), 3, "network errors and cut-off answers are retried");
    calls = script(reply(401, { message: "Bad credentials" }));
    await assert.rejects(fetchProfile("mona", "t", quick), /401/);
    assert.equal(calls(), 1);
    calls = script(reply(200, { data: { user: null } }));
    await assert.rejects(fetchProfile("mona", "t", quick), /not found/);
    assert.equal(calls(), 1);
    calls = script(reply(503, {}));
    await assert.rejects(fetchProfile("mona", "t", quick), /503/);
    assert.equal(calls(), 3, "gives up after two retries");
  } finally {
    globalThis.fetch = realFetch;
    console.warn = warn;
    if (cache !== undefined) process.env.CALENDAR_CACHE = cache;
  }
}
// Bad CLI inputs end with a clear message, not a stack trace
{
  const { spawnSync } = await import("node:child_process");
  const cli = new URL("../src/cli.mjs", import.meta.url).pathname;
  for (const [arg, message] of [["--out=", /output-dir is empty/], ["--readme=", /readme is empty/], ["--readme-position=middle", /top or bottom/], ["--bogus", /Unknown option/]]) {
    const r = spawnSync(process.execPath, [cli, "--login=x", arg], { env: { ...process.env, GITHUB_TOKEN: "t" } });
    assert.equal(r.status, 1, arg);
    assert.match(r.stderr.toString(), message);
    assert.ok(!r.stderr.toString().includes("    at "), `${arg}: no stack trace`);
  }
}
// Every list of effects (Action docs, installer, configurator, READMEs) matches the registry
{
  const { readFile } = await import("node:fs/promises");
  const { EFFECTS } = await import("../src/registry.mjs");
  const { EFFECT_TEXT_RU } = await import("../site/i18n.mjs");
  const read = (p) => readFile(new URL(`../${p}`, import.meta.url), "utf8");
  const ids = Object.keys(EFFECTS);
  const listed = (await read("action.yml")).match(/`all`: ([^"]+)"/)[1].split(",").map((s) => s.trim());
  assert.deepEqual(listed, ids, "action.yml's effects description lists every effect");
  assert.deepEqual((await read("install.sh")).match(/^AVAILABLE="([^"]+)"/m)[1].split(" "), ids, "install.sh knows every effect");
  assert.deepEqual(Object.keys(EFFECT_TEXT_RU), ids, "every effect has a Russian title in the configurator");
  for (const readme of ["README.md", "README.ru.md"]) {
    const text = await read(readme);
    for (const id of ids) {
      const image = id === "countdown" ? "examples/modes/countdown/countdown.svg" : `examples/${id}.svg`;
      assert.ok(text.includes(image), `${readme} shows ${image}`);
    }
  }
}
// The one-command installer writes exactly the configurator's workflow (with a stub gh)
{
  const { mkdtemp, readFile, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const { installCommand, workflowYaml } = await import("../site/output.mjs");
  const dir = await mkdtemp(join(tmpdir(), "cyp-install-"));
  await writeFile(join(dir, "gh"), `#!/bin/sh
case "$1 $2" in "auth status" | "repo view" | "workflow run") exit 0 ;; "api user") echo mona; exit 0 ;; esac
for a in "$@"; do case "$a" in content=*) printf '%s' "\${a#content=}" > "$STUB_DIR/upload" ;; esac; done
case " $* " in *" -X PUT "*) exit 0 ;; esac
exit 1
`, { mode: 0o755 });
  const installer = new URL("../install.sh", import.meta.url).pathname;
  for (const cfg of [
    { effects: ["dino-run"], style: "clean", language: "en", name: "", tagline: "", skills: "", seasons: [], birthday: "", countdown: "", position: "top" },
    { effects: ["intro", "rpg-card", "dino-run"], style: "neon", language: "ru", name: `Ma"k \\ o'N $(x)`, tagline: "a|b ${{ github.token }}", skills: "Go, C#",
      seasons: ["new-year", "halloween"], birthday: "03-15", countdown: "2026-12-31 Release; birthday", position: "bottom" },
  ]) {
    const command = installCommand(cfg).replace(/bash <\(curl[^)]*\)/, `bash '${installer}'`);
    execFileSync("bash", ["-c", command], { env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, STUB_DIR: dir }, stdio: "pipe" });
    const uploaded = Buffer.from(await readFile(join(dir, "upload"), "utf8"), "base64").toString();
    assert.equal(uploaded, workflowYaml(cfg), `installer and configurator agree for ${cfg.effects.join(",")}`);
  }
}

console.log(`ok: ${count} SVGs across ${PROFILES.length} profiles × ${OPTIONS.length} option sets (modes off / all on), mode, README, configurator, installer and consistency checks pass`);
