// Generates an animated SVG: a spaceship on the left shoots down contribution
// cells that fly at it from the right, biggest contributions first.

import { monthLabels } from "../lib.mjs";

export default function render({ login, days, weeks, total }, options = {}) {

  // ---------- layout ----------
  const STEP = 13, CELL = 10;
  const GRID_X = 110, GRID_Y = 30;
  const WEEKS = weeks;
  const WIDTH = GRID_X + WEEKS * STEP + 8;
  const HEIGHT = GRID_Y + 7 * STEP + 10;
  const SHIP_NOSE = 44;
  const rowCenter = (r) => GRID_Y + r * STEP + CELL / 2;

  const cells = days.map((d) => ({
    col: d.col, row: d.row, date: d.date, count: d.count, level: d.level,
    x: GRID_X + d.col * STEP, y: GRID_Y + d.row * STEP,
  }));

  // Biggest first (at most 40, so busy profiles keep a short loop); ties by level, then date.
  const targets = cells
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || b.level - a.level || a.date.localeCompare(b.date))
    .slice(0, 40);

  // ---------- timeline (seconds) ----------
  const V_COMMIT = 300, V_BULLET = 700, AIM = 0.2, BOOM = 0.45, BREATH = 0.15;
  let t = 0.8;
  const startRow = 3;
  for (const c of targets) {
    const cx = c.x + CELL / 2;
    c.t0 = t;                                   // commit launches, ship starts aiming
    c.tf = t + AIM;                             // ship fires
    const dt = Math.max(0, (cx - V_COMMIT * AIM - SHIP_NOSE) / (V_COMMIT + V_BULLET));
    c.th = c.tf + dt;                           // bullet meets commit
    c.meetX = SHIP_NOSE + V_BULLET * dt;
    c.dx = c.meetX - cx;
    t = c.th + BREATH;
  }
  const lastHit = targets.length ? targets.at(-1).th : t;
  const FADE_START = lastHit + BOOM + 1.5;
  const FADE_END = FADE_START + 1;
  const DURATION = FADE_END + 0.6;
  const EPS = 0.004;
  const pct = (s) => `${Math.min(100, (s / DURATION) * 100).toFixed(4)}%`;

  // ---------- svg pieces ----------
  const SHIP = [
    "..##.......",
    "..###......",
    ".######....",
    "####**###..",
    "###########",
    "#########..",
    ".######....",
    "..###......",
    "..##.......",
  ];
  const PX = 2;
  const shipPixels = (ch) =>
    SHIP.flatMap((line, y) => [...line].map((c, x) => (c === ch ? `M${x * PX} ${y * PX}h${PX}v${PX}h-${PX}z` : "")))
      .join("");

  // Frames are [time, css, tween?]. Without `tween` the value jumps at `time`
  // instead of easing in from the previous frame, so we insert a hold just before.
  const HOLD = 0.002;
  function keyframes(name, frames) {
    const out = [];
    frames.forEach(([s, css, tween], i) => {
      const prev = out.at(-1);
      if (prev && !tween && s - HOLD > prev[0] && prev[1] !== css) out.push([s - HOLD, prev[1]]);
      out.push([s, css]);
    });
    return `@keyframes ${name}{${out.map(([s, css]) => `${pct(s)}{${css}}`).join("")}}`;
  }
  const TW = true;

  function draw(theme) {
    const css = [];
    const out = [];

    // Background + labels
    if (theme.bg) out.push(`<rect width="${WIDTH}" height="${HEIGHT}" rx="6" fill="${theme.bg}"/>`);
    for (const { col, date } of monthLabels(days, WEEKS)) {
      const d = new Date(date + "T00:00:00Z");
      out.push(`<text x="${GRID_X + col * STEP}" y="${GRID_Y - 10}" class="lbl">${d.toLocaleString("en", { month: "short", timeZone: "UTC" })}</text>`);
    }

    // Empty grid underneath everything
    for (const c of cells)
      out.push(`<rect x="${c.x}" y="${c.y}" width="${CELL}" height="${CELL}" rx="2" fill="${theme.levels[0]}"/>`);

    // Flying commits, bullets, explosions
    targets.forEach((c, i) => {
      const color = theme.levels[c.level];
      const cy = c.y + CELL / 2;
      const s = 1 + 0.25 * c.level;
      const home = "transform:translate(0,0) scale(1)";
      const shot = `transform:translate(${c.dx.toFixed(1)}px,0) scale(${s})`;

      css.push(keyframes(`c${i}`, [
        [0, `${home};opacity:1`], [c.t0, `${home};opacity:1`],
        [c.th, `${shot};opacity:1`, TW], [c.th + EPS, `${shot};opacity:0`],
        [c.th + 2 * EPS, `${home};opacity:0`], [FADE_START, `${home};opacity:0`],
        [FADE_END, `${home};opacity:1`, TW], [DURATION, `${home};opacity:1`],
      ]));
      out.push(`<rect class="c" style="animation-name:c${i}" x="${c.x}" y="${c.y}" width="${CELL}" height="${CELL}" rx="2" fill="${color}"><title>${c.count} contributions on ${c.date}</title></rect>`);

      css.push(keyframes(`b${i}`, [
        [0, "transform:translate(0,0);opacity:0"], [c.tf, "transform:translate(0,0);opacity:1"],
        [c.th, `transform:translate(${(c.meetX - SHIP_NOSE).toFixed(1)}px,0);opacity:1`, TW],
        [c.th + EPS, `transform:translate(${(c.meetX - SHIP_NOSE).toFixed(1)}px,0);opacity:0`],
        [DURATION, "transform:translate(0,0);opacity:0"],
      ]));
      out.push(`<rect class="b" style="animation-name:b${i}" x="${SHIP_NOSE - 7}" y="${cy - 1}" width="7" height="2" rx="1" fill="${theme.bullet}"/>`);

      // Flash + debris, sized by how big the commit was
      css.push(keyframes(`f${i}`, [
        [0, "transform:scale(0);opacity:0"], [c.th, "transform:scale(0.3);opacity:1"],
        [c.th + BOOM * 0.6, `transform:scale(${1 + c.level * 0.3});opacity:0`, TW], [DURATION, "transform:scale(0);opacity:0"],
      ]));
      out.push(`<circle class="fx" style="animation-name:f${i}" cx="${c.meetX.toFixed(1)}" cy="${cy}" r="8" fill="${theme.flash}"/>`);

      const n = 5 + c.level;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + i;
        const r = 10 + c.level * 4 + ((k * 7 + i) % 5);
        const tx = (Math.cos(a) * r).toFixed(1), ty = (Math.sin(a) * r).toFixed(1);
        css.push(keyframes(`p${i}_${k}`, [
          [0, "transform:translate(0,0);opacity:0"], [c.th, "transform:translate(0,0);opacity:1"],
          [c.th + BOOM, `transform:translate(${tx}px,${ty}px);opacity:0`, TW], [DURATION, "transform:translate(0,0);opacity:0"],
        ]));
        out.push(`<rect class="fx" style="animation-name:p${i}_${k}" x="${(c.meetX - 1.5).toFixed(1)}" y="${cy - 1.5}" width="3" height="3" fill="${color}"/>`);
      }
    });

    // Ship path through the rows
    const shipFrames = [[0, `transform:translateY(${rowCenter(startRow)}px)`]];
    let prev = rowCenter(startRow);
    for (const c of targets) {
      const y = c.y + CELL / 2;
      shipFrames.push([c.t0, `transform:translateY(${prev}px)`], [c.t0 + AIM * 0.9, `transform:translateY(${y}px)`, TW]);
      // tiny recoil on fire
      shipFrames.push([c.tf, `transform:translate(0,${y}px)`], [c.tf + 0.05, `transform:translate(-3px,${y}px)`, TW], [c.tf + 0.12, `transform:translate(0,${y}px)`, TW]);
      prev = y;
    }
    shipFrames.push([FADE_START, `transform:translateY(${prev}px)`], [FADE_END, `transform:translateY(${rowCenter(startRow)}px)`, TW], [DURATION, `transform:translateY(${rowCenter(startRow)}px)`]);
    // normalize: every frame uses translate(x,y)
    css.push(keyframes("ship", shipFrames.map(([s, v, tw]) => [s, v.replace(/translateY\(([^)]+)\)/, "translate(0,$1)"), tw])));

    const sh = SHIP.length * PX;
    out.push(`<g class="ship"><g transform="translate(${SHIP_NOSE - SHIP[0].length * PX},${-sh / 2})">
      <path class="flame" d="M-1 ${sh / 2 - 4}h-6l-3 4 3 4h6z" fill="${theme.flame}"/>
      <path d="${shipPixels("#")}" fill="${theme.ship}"/>
      <path d="${shipPixels("*")}" fill="${theme.cockpit}"/>
    </g></g>`);

    const style = `
      .lbl{font:10px -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:${theme.text}}
      .c,.b,.fx,.ship{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
      .c,.fx{transform-box:fill-box;transform-origin:center}
      .ship{animation-name:ship}
      .flame{transform-box:fill-box;transform-origin:right center;animation:flick .12s ease-in-out infinite alternate}
      @keyframes flick{from{transform:scaleX(.6);opacity:.7}to{transform:scaleX(1.1);opacity:1}}
      ${css.join("\n")}`;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" data-bg="${theme === light ? "light" : "dark"}">
  <title>${login}: ${total} contributions in the last year</title>
  <style>${style}</style>
  ${out.join("\n")}
  </svg>`;
  }

  const light = {
    bg: null, text: "#59636e", bullet: "#cf222e", flash: "#ffd33d", flame: "#fb8f44",
    ship: "#0969da", cockpit: "#9cd7ff",
    levels: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  };
  const dark = {
    bg: null, text: "#9198a1", bullet: "#ff7b72", flash: "#f2cc60", flame: "#ffa657",
    ship: "#58a6ff", cockpit: "#cae8ff",
    levels: ["#151b23", "#0e4429", "#006d32", "#26a641", "#39d353"],
  };

  return [
    { file: "space-shooter.svg", svg: draw(light) },
    { file: "space-shooter-dark.svg", svg: draw(dark) },
  ];
}
