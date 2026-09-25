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
  const probe = installCommand(cfg).replace(/bash <\(curl[^)]*\)/, `bash -c 'printf "%s" "$NAME"' _`);
  assert.equal(run("bash", ["-c", probe]).toString(), tricky, "shell command passes the value exactly, nothing is executed");
  assert.ok(newWorkflowUrl("mona", "main", yaml).startsWith("https://github.com/mona/mona/new/main?filename=.github%2Fworkflows%2Fprofile-effects.yml&value="));
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

console.log(`ok: ${count} SVGs across ${PROFILES.length} profiles × ${OPTIONS.length} option sets (modes off / all on), mode + README + configurator checks pass`);
