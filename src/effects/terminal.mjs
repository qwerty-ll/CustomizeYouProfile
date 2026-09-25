// A terminal window types `git log --stats`, then prints an ASCII-style
// contribution graph with a stats panel, a monthly bar chart and a blinking cursor.

import { GH_DARK, MONO, TW, esc, f1, keyframeBuilder, monthName, monthsOf, rng, seedFor } from "../lib.mjs";

export default function render({ login, days, weeks, total, maxCount }, options = {}) {
  const random = rng(seedFor(login, 7));
  const W = 860, LH = 19, CW = 7.8, PADX = 22, TOP = 34;
  const C = { bg: "#0d1117", bar: "#161b22", border: "#30363d", text: "#c9d1d9", dim: "#8b949e", green: "#3fb950", blue: "#58a6ff", purple: "#bc8cff", yellow: "#e3b341", pink: "#ff7b72" };

  // ---------- stats ----------
  const active = days.filter((d) => d.count > 0);
  const best = days.reduce((a, b) => (b.count > a.count ? b : a));
  let longest = 0, run = 0;
  for (const d of days) { run = d.count ? run + 1 : 0; longest = Math.max(longest, run); }
  let current = 0;
  for (let i = days.length - 1 - (days.at(-1).count ? 0 : 1); i >= 0 && days[i].count; i--) current++;
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const d of days) byWeekday[d.row] += d.count;
  const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const topWeekday = WD[byWeekday.indexOf(Math.max(...byWeekday))];
  const months = monthsOf(days);
  const topMonth = months.reduce((a, b) => (b.total > a.total ? b : a));
  const fmt = (date) => `${monthName(date)} ${Number(date.slice(8))}`;
  const stats = [
    ["commits", `${total}`, C.yellow],
    ["active days", `${active.length}/${days.length}`, C.green],
    ["best day", `${best.count} (${fmt(best.date)})`, C.pink],
    ["streak max", `${longest} day${longest === 1 ? "" : "s"}`, C.purple],
    ["streak now", `${current} day${current === 1 ? "" : "s"}`, C.purple],
    ["top weekday", topWeekday, C.blue],
    ["top month", `${topMonth.name} ${topMonth.year}`, C.blue],
  ];

  // ---------- timeline ----------
  const PROMPT = `${login}@github ~ %`;
  const COMMAND = `git log --stats --since="1 year ago"`;
  const T0 = 0.7;
  const typeTimes = [];
  let t = T0;
  for (let i = 0; i < COMMAND.length; i++) { typeTimes.push(t); t += 0.045 + random() * 0.05 + (COMMAND[i] === " " ? 0.05 : 0); }
  const ENTER = t + 0.25;
  const LOADED = ENTER + 0.9;
  const GRID_IN = LOADED + 0.2, GRID_T = 1.6;
  const STATS_IN = GRID_IN + 0.3, STAT_GAP = 0.22;
  const BARS_IN = GRID_IN + GRID_T + 0.2;
  const DONE = BARS_IN + 1.2;
  const DURATION = DONE + 6;
  const keyframes = keyframeBuilder(DURATION);
  const css = [];
  const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);
  const showAt = (name, at, cls = "") => anim(name, [[0, "opacity:0"], [at, "opacity:1"], [DURATION - 0.5, "opacity:1"], [DURATION - 0.2, "opacity:0", TW]], cls);

  // ---------- layout ----------
  const line = (n) => TOP + 22 + n * LH;
  const mono = (x, y, s, fill, extra = "") =>
    `<text x="${x}" y="${y}" fill="${fill}" textLength="${f1(s.length * CW)}" lengthAdjust="spacing"${extra}>${esc(s)}</text>`;
  const STEP = 10.6, GRID_X = PADX + 4 * CW + 6, GRID_Y = line(4) - 9;
  const H = line(13) + 14;

  const defs = [], out = [];
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="12"/></clipPath>`);
  defs.push(`<linearGradient id="barg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0e4429"/><stop offset="1" stop-color="#39d353"/></linearGradient>`);
  defs.push(`<filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);

  // window chrome
  out.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);
  out.push(`<rect width="${W}" height="${TOP}" fill="${C.bar}"/><rect y="${TOP - 1}" width="${W}" height="1" fill="${C.border}"/>`);
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => out.push(`<circle cx="${20 + i * 20}" cy="${TOP / 2}" r="6" fill="${c}"/>`));
  out.push(`<text x="${W / 2}" y="${TOP / 2 + 4}" text-anchor="middle" class="ttl">${esc(login)} — git log — zsh — 110×24</text>`);

  // line 0: prompt + typed command
  const cmdX = PADX + (PROMPT.length + 1) * CW;
  out.push(`<g class="t">${mono(PADX, line(0), PROMPT, C.green)}</g>`);
  const typeFrames = [[0, "transform:scaleX(0)"]];
  typeTimes.forEach((tt, i) => typeFrames.push([tt, `transform:scaleX(${((i + 1) / COMMAND.length).toFixed(4)})`]));
  typeFrames.push([DURATION - 0.5, "transform:scaleX(1)"], [DURATION - 0.2, "transform:scaleX(0)"]);
  defs.push(`<clipPath id="typed"><rect x="${cmdX}" y="${line(0) - 14}" width="${f1(COMMAND.length * CW)}" height="${LH}" ${anim("type", typeFrames, "fbl")}/></clipPath>`);
  out.push(`<g class="t" clip-path="url(#typed)">${mono(cmdX, line(0), COMMAND, C.text)}</g>`);
  // typing cursor rides the end of the typed text, then disappears on Enter
  const curFrames = [[0, `transform:translateX(0);opacity:1`]];
  typeTimes.forEach((tt, i) => curFrames.push([tt, `transform:translateX(${f1((i + 1) * CW)}px);opacity:1`]));
  curFrames.push([ENTER, `transform:translateX(${f1(COMMAND.length * CW)}px);opacity:0`], [DURATION - 0.2, `transform:translateX(0);opacity:0`], [DURATION, "transform:translateX(0);opacity:1"]);
  out.push(`<rect x="${cmdX}" y="${line(0) - 12}" width="${CW}" height="15" fill="${C.text}" ${anim("cur1", curFrames)}/>`);

  // line 1: fetching… done
  out.push(`<g ${showAt("fetch", ENTER)}>${mono(PADX, line(1), "→ fetching contributions", C.dim)}
    <g ${anim("dots", [[0, "opacity:1"], [LOADED, "opacity:0"]])}>${[0, 1, 2].map((k) => `<text x="${f1(PADX + (25 + k) * CW)}" y="${line(1)}" fill="${C.dim}" style="animation:dot 0.9s steps(1) ${f1(-0.3 * (2 - k))}s infinite">.</text>`).join("")}</g>
    <g ${anim("ok", [[0, "opacity:0"], [LOADED, "opacity:1"]])}>${mono(f1(PADX + 25 * CW), line(1), `done ✓ ${days.length} days`, C.green)}</g>
  </g>`);
  css.push(`@keyframes dot{0%{opacity:0}33%{opacity:1}}`);

  // lines 3..10: month header + 7-row graph, revealed left to right like it's being printed
  let grid = "";
  let lastCol = -3;
  const firstOfCol = new Map();
  for (const d of days) if (!firstOfCol.has(d.col)) firstOfCol.set(d.col, d);
  for (const [col, d] of firstOfCol)
    if (Number(d.date.slice(8)) <= 7 && col - lastCol >= 3 && col < weeks - 1) {
      grid += `<text x="${f1(GRID_X + col * STEP)}" y="${line(3)}" fill="${C.dim}" class="sm">${monthName(d.date)}</text>`;
      lastCol = col;
    }
  ["Mon", "Wed", "Fri"].forEach((n, k) => (grid += mono(PADX, GRID_Y + (1 + 2 * k) * STEP + 9, n, C.dim, ` class="sm"`)));
  for (const d of days) {
    const x = f1(GRID_X + d.col * STEP), y = f1(GRID_Y + d.row * STEP);
    grid += d.level
      ? `<rect x="${x}" y="${y}" width="8.6" height="8.6" rx="1.5" fill="${GH_DARK[d.level]}"${d.level >= 3 ? ` filter="url(#glow)"` : ""}><title>${d.count} on ${d.date}</title></rect>`
      : `<rect x="${f1(x + 3.3)}" y="${f1(y + 3.3)}" width="2" height="2" fill="${C.border}"/>`;
  }
  defs.push(`<clipPath id="sweep"><rect x="${PADX - 2}" y="${line(3) - 14}" width="${f1(GRID_X - PADX + weeks * STEP + 4)}" height="${9 * STEP + 20}" ${anim("sweep", [
    [0, "transform:scaleX(0)"], [GRID_IN, `transform:scaleX(0);animation-timing-function:steps(${weeks})`],
    [GRID_IN + GRID_T, "transform:scaleX(1)", TW], [DURATION - 0.5, "transform:scaleX(1)"], [DURATION - 0.2, "transform:scaleX(0)"],
  ], "fbl")}/></clipPath>`);
  out.push(`<g clip-path="url(#sweep)" ${showAt("gridv", GRID_IN)}>${grid}</g>`);

  // stats panel to the right of the graph, one row per graph row
  const SX = GRID_X + weeks * STEP + 22;
  out.push(`<rect x="${f1(SX - 12)}" y="${line(3) - 13}" width="1" height="${8 * LH - 4}" fill="${C.border}" ${showAt("sep", STATS_IN)}/>`);
  stats.forEach(([label, value, color], i) => {
    const y = line(3 + i) + 1;
    out.push(`<g ${showAt(`s${i}`, STATS_IN + i * STAT_GAP)}>${mono(f1(SX), y, label.padEnd(11, "."), C.dim)}${mono(f1(SX + 12 * CW), y, value, color, ` font-weight="bold"`)}</g>`);
  });

  // line 12: commits per month, bars grow in sequence
  const maxM = Math.max(1, ...months.map((m) => m.total));
  const BX = PADX + 12 * CW, BW = 22, BH = 26, BY = line(11) + 4;
  out.push(`<g ${showAt("bl", BARS_IN)}>${mono(PADX, line(11), "per month", C.dim)}</g>`);
  months.forEach((m, i) => {
    const h = f1(2 + (m.total / maxM) * BH);
    out.push(`<g ${showAt(`b${i}`, BARS_IN + i * 0.06)}>
      <rect x="${f1(BX + i * (BW + 6))}" y="${f1(BY - h)}" width="${BW}" height="${h}" rx="2" fill="url(#barg)"><title>${m.name} ${m.year}: ${m.total}</title></rect>
      <text x="${f1(BX + i * (BW + 6) + BW / 2)}" y="${BY + 12}" text-anchor="middle" fill="${m === topMonth ? C.yellow : C.dim}" class="xs">${m.name}</text>
      ${m.total ? `<text x="${f1(BX + i * (BW + 6) + BW / 2)}" y="${f1(BY - h - 3)}" text-anchor="middle" fill="${C.text}" class="xs">${m.total}</text>` : ""}
    </g>`);
  });
  const avg = (total / Math.max(1, active.length)).toFixed(1);
  out.push(`<g ${showAt("avg", BARS_IN + 0.8)}>${mono(f1(BX + months.length * (BW + 6) + 16), line(11), `avg ${avg}/active day`, C.dim)}</g>`);

  // final prompt with blinking cursor
  out.push(`<g ${showAt("p2", DONE)}>${mono(PADX, line(13), PROMPT, C.green)}<rect x="${f1(cmdX)}" y="${line(13) - 12}" width="${CW}" height="15" fill="${C.text}" style="animation:blink 1s steps(1) infinite"/></g>`);
  css.push(`@keyframes blink{50%{opacity:0}}`);

  const style = `
    .m{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .fbl{transform-box:fill-box;transform-origin:left center}
    text{font:13px ${MONO};white-space:pre}
    .sm{font-size:11px}
    .xs{font-size:9px}
    .ttl{font:12px ${MONO};fill:${C.dim}}
    ${css.join("\n")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${login}: git log --stats</title>
  <defs>${defs.join("")}</defs>
  <style>${style}</style>
  <g clip-path="url(#frame)">
  ${out.join("\n")}
  <rect width="${W}" height="${H}" rx="12" fill="none" stroke="${C.border}"/>
  </g>
  </svg>`;
  return [{ file: "terminal.svg", svg }];
}
