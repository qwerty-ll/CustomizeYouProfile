// Renders every effect for synthetic profiles (empty, light, heavy, odd) and
// checks the SVGs are well-formed, reasonably small and loop quickly.
//   node test/validate.mjs

import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { buildContext, rng } from "../src/lib.mjs";
import { updateReadme, START, END } from "../src/readme.mjs";

const LEVEL_NAMES = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

function fakeUser({ login, activity, peak, langs = 5, name = "Test User", seed = 1 }) {
  const random = rng(seed);
  const start = new Date(Date.UTC(2025, 8, 21));
  const weeks = [];
  let total = 0;
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * 864e5);
      const count = random() < activity ? Math.ceil(random() ** 3 * peak) : 0;
      total += count;
      days.push({ date: date.toISOString().slice(0, 10), weekday: d, contributionCount: count, contributionLevel: LEVEL_NAMES[count === 0 ? 0 : Math.min(4, 1 + Math.floor((count / peak) * 4))] });
    }
    weeks.push({ contributionDays: days });
  }
  const palette = ["#f1e05a", "#3178c6", "#3572A5", "#e34c26", "#563d7c", "#178600", "#00ADD8", "#dea584", "#b07219"];
  const names = ["JavaScript", "TypeScript", "Python", "HTML", "CSS", "C#", "Go", "Rust", "Java"];
  return {
    login, name, avatarUrl: "https://example.invalid/a.png", createdAt: "2019-01-01T00:00:00Z",
    followers: { totalCount: Math.round(peak * 3) }, pullRequests: { totalCount: Math.round(peak * 5) }, issues: { totalCount: 4 },
    repositories: { totalCount: langs * 3, nodes: Array.from({ length: langs * 3 }, (_, i) => ({
      name: `repo${i}`, stargazerCount: i * 2,
      languages: { edges: [{ size: Math.round(100000 / (i + 1)), node: { name: names[i % langs], color: palette[i % langs] } }] },
    })) },
    contributionsCollection: {
      totalCommitContributions: total, totalPullRequestContributions: 3, totalIssueContributions: 1, totalPullRequestReviewContributions: 0,
      contributionCalendar: { totalContributions: total, weeks },
    },
  };
}

const PROFILES = [
  fakeUser({ login: "empty", activity: 0, peak: 1, langs: 0 }),
  fakeUser({ login: "light", activity: 0.1, peak: 40, seed: 2 }),
  fakeUser({ login: "heavy", activity: 0.97, peak: 400, langs: 9, seed: 3 }),
  fakeUser({ login: "a-very-long-login-name-xx", activity: 0.4, peak: 12, name: "Someone With A Really Quite Long Display Name", seed: 4 }),
];
const OPTIONS = [
  { language: "en", tagline: [], skills: [] },
  { language: "ru", name: "Макар", tagline: ["строка с <угловыми> & скобками", "x".repeat(120)], skills: ["React", "Node.js", "C#", "<script>"] },
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
      for (const { file, svg } of files) {
        const where = `${id}/${file} for ${user.login} (${options.language})`;
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

// README block handling
const b = "<img src=a.svg>";
assert.equal(updateReadme(null, b), `${START}\n${b}\n${END}\n`);
const mine = "# Hi\n\ntext\n";
const top = updateReadme(mine, b, "top");
assert.ok(top.startsWith(START) && top.endsWith(mine));
assert.ok(updateReadme(mine, b, "bottom").trimEnd().endsWith(END));
const again = updateReadme(top, "<img src=b.svg>");
assert.ok(again.includes("b.svg") && !again.includes("a.svg") && again.split(START).length === 2);

console.log(`ok: ${count} SVGs across ${PROFILES.length} profiles × ${OPTIONS.length} option sets, README checks pass`);
