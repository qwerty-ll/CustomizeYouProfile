// A black hole opens in the middle of the contribution graph, spirals every
// cell into itself, collapses in a big bang and the graph re-forms.

import { GH_DARK, MONO, TW, f1, keyframeBuilder, monthName, rng, seedFor } from "../lib.mjs";

export default function render({ login, days, weeks, total, maxCount }, options = {}) {
  const W = 860, H = 270, STEP = 13, CELL = 10;
  const GX = (W - weeks * STEP) / 2, GY = (H - 7 * STEP) / 2 + 14;
  const CX = W / 2, CY = GY + (7 * STEP) / 2;
  const random = rng(seedFor(login, 4242));

  // ---------- timeline ----------
  const T = { appear: 1.0, pull: 2.4, swallowed: 7.2, bang: 8.4, rebuilt: 10.6 };
  const DURATION = 15.5;
  const keyframes = keyframeBuilder(DURATION);
  const css = [];
  const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);

  // ---------- cells: one shared keyframe set, per-cell polar coordinates in CSS vars ----------
  const HOME = "rotate(var(--a)) translateX(var(--r)) rotate(calc(-1 * var(--a))) scale(1)";
  const IN = "rotate(calc(var(--a) + var(--s))) translateX(0px) rotate(calc(-1 * var(--a))) scale(.05)";
  const OUT_START = "rotate(calc(var(--a) - var(--s) * .5)) translateX(0px) rotate(calc(-1 * var(--a))) scale(.05)";
  css.push(keyframes("cell", [
    [0, `transform:${HOME};opacity:1`],
    [T.pull, `transform:${HOME};opacity:1;animation-timing-function:cubic-bezier(.55,0,.85,.55)`],
    [T.swallowed - 0.35, `transform:${IN};opacity:1`, TW],
    [T.swallowed, `transform:${IN};opacity:0`, TW],
    [T.bang, `transform:${OUT_START};opacity:0`],
    [T.bang + 0.05, `transform:${OUT_START};opacity:1;animation-timing-function:cubic-bezier(.2,1.35,.45,1)`],
    [T.rebuilt, `transform:${HOME};opacity:1`, TW],
  ]));
  const cells = days.map((d) => {
    const x = GX + d.col * STEP + CELL / 2 - CX, y = GY + d.row * STEP + CELL / 2 - CY;
    const r = Math.hypot(x, y), a = (Math.atan2(y, x) * 180) / Math.PI;
    const spin = 380 + 70000 / (r + 50) + random() * 60;
    return `<rect x="-5" y="-5" width="${CELL}" height="${CELL}" rx="2" fill="${GH_DARK[d.level]}" style="--a:${f1(a)}deg;--r:${f1(r)}px;--s:${f1(spin)}deg"><title>${d.count} contributions on ${d.date}</title></rect>`;
  });

  // ---------- scene ----------
  const defs = [], out = [];
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>`);
  defs.push(`<filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<filter id="blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>`);
  defs.push(`<radialGradient id="halo"><stop offset=".25" stop-color="#ff9a3c" stop-opacity=".55"/><stop offset=".55" stop-color="#c2255c" stop-opacity=".25"/><stop offset="1" stop-color="#5f3dc4" stop-opacity="0"/></radialGradient>`);
  defs.push(`<linearGradient id="disk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd8a8"/><stop offset=".4" stop-color="#ff922b"/><stop offset=".75" stop-color="#e64980"/><stop offset="1" stop-color="#7048e8"/></linearGradient>`);
  defs.push(`<clipPath id="front"><rect x="-200" y="0" width="400" height="200"/></clipPath>`);
  defs.push(`<clipPath id="behind"><rect x="-200" y="-200" width="400" height="200"/></clipPath>`);
  out.push(`<rect width="${W}" height="${H}" fill="#03030a"/>`);

  // stars get dragged a little toward the hole while it's alive
  let stars = "";
  for (let i = 0; i < 110; i++) {
    const x = random() * W, y = random() * H;
    stars += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${random() < 0.1 ? 1.1 : 0.6}" fill="#fff" style="--x:${f1((CX - x) * 0.12)}px;--y:${f1((CY - y) * 0.12)}px;animation:tw ${f1(1.5 + random() * 3)}s ease-in-out ${f1(-random() * 3)}s infinite alternate"/>`;
  }
  css.push(`@keyframes tw{from{opacity:.15}to{opacity:.8}}`);
  css.push(keyframes("drag", [
    [0, "transform:translate(0,0)"], [T.pull, "transform:translate(0,0)"],
    [T.bang, "transform:translate(var(--x),var(--y))", TW], [T.bang + 0.6, "transform:translate(0,0)", TW],
  ]));
  out.push(`<g class="stars">${stars}</g>`);

  // labels fade out while the graph is being eaten
  let labels = "";
  let lastCol = -3;
  const firstOfCol = new Map();
  for (const d of days) if (!firstOfCol.has(d.col)) firstOfCol.set(d.col, d);
  for (const [col, d] of firstOfCol) {
    if (Number(d.date.slice(8)) <= 7 && col - lastCol >= 3 && col < weeks - 1) {
      labels += `<text x="${GX + col * STEP}" y="${GY - 8}" class="lbl">${monthName(d.date)}</text>`;
      lastCol = col;
    }
  }
  ["Mon", "Wed", "Fri"].forEach((n, k) => (labels += `<text x="${GX - 8}" y="${GY + (1 + 2 * k) * STEP + 8}" class="lbl" text-anchor="end">${n}</text>`));
  out.push(`<g ${anim("labels", [[0, "opacity:1"], [T.pull, "opacity:1"], [T.pull + 1, "opacity:0", TW], [T.rebuilt - 0.4, "opacity:0"], [T.rebuilt + 0.4, "opacity:1", TW]])}>${labels}</g>`);

  // black hole
  const hole = [];
  hole.push(`<circle r="95" fill="url(#halo)"/>`);
  const ring = (r, w, dash, speed, dir, clip) =>
    `<g clip-path="url(#${clip})"><g transform="scale(1,.3) rotate(0)"><circle r="${r}" fill="none" stroke="url(#disk)" stroke-width="${w}" stroke-dasharray="${dash}" stroke-linecap="round" style="animation:spin ${speed}s linear infinite${dir < 0 ? " reverse" : ""}"/></g></g>`;
  const disk = (clip) => [
    ring(62, 6, "30 8 12 6", 3.2, 1, clip), ring(50, 8, "44 6 20 10", 2.4, 1, clip),
    ring(40, 5, "18 5", 1.7, 1, clip), ring(74, 2, "4 10", 5, 1, clip),
  ].join("");
  css.push(`@keyframes spin{to{transform:rotate(360deg)}}`);
  hole.push(`<g transform="rotate(-10)" filter="url(#glow)">${disk("behind")}</g>`);
  hole.push(`<circle r="29" fill="none" stroke="#ffb347" stroke-width="3" opacity=".7" filter="url(#glow)"/>`);   // lensed far side
  hole.push(`<circle r="25" fill="#000"/>`);
  hole.push(`<circle r="25.5" fill="none" stroke="#fff1d6" stroke-width="1.2" opacity=".9" filter="url(#glow)"/>`); // photon ring
  hole.push(`<g transform="rotate(-10)" filter="url(#glow)">${disk("front")}</g>`);
  out.push(`<g transform="translate(${CX},${CY})"><g ${anim("hole", [
    [0, "transform:scale(0);opacity:0"], [T.appear, "transform:scale(0);opacity:0"],
    [T.pull, "transform:scale(.55);opacity:1", TW],
    [T.swallowed, "transform:scale(1);opacity:1", TW],
    [T.swallowed + 0.35, "transform:scale(1.18);opacity:1", TW], [T.swallowed + 0.6, "transform:scale(1.06);opacity:1", TW],
    [T.swallowed + 0.85, "transform:scale(1.3);opacity:1", TW], [T.bang - 0.1, "transform:scale(1.45);opacity:1", TW],
    [T.bang, "transform:scale(0);opacity:0", TW],
  ])}>${hole.join("")}</g></g>`);

  // the graph itself, pulled into the hole
  css.push(`.cells rect{animation:cell ${DURATION.toFixed(3)}s linear infinite both}`);
  css.push(`.stars circle{animation-name:tw,drag;animation-duration:3s,${DURATION.toFixed(3)}s;animation-timing-function:ease-in-out,linear;animation-iteration-count:infinite;animation-direction:alternate,normal}`);
  out.push(`<g class="cells" transform="translate(${CX},${CY})">${cells.join("")}</g>`);

  // big bang: flash, shock rings, sparks
  out.push(`<rect width="${W}" height="${H}" fill="#fff4e0" ${anim("flash", [[0, "opacity:0"], [T.bang, "opacity:.75"], [T.bang + 0.6, "opacity:0", TW]])}/>`);
  [["#ffffff", 0], ["#ff922b", 0.12], ["#7048e8", 0.26]].forEach(([c, dly], k) =>
    out.push(`<circle cx="${CX}" cy="${CY}" r="480" fill="none" stroke="${c}" stroke-width="${3 - k * 0.6}" vector-effect="non-scaling-stroke" ${anim(`shock${k}`, [
      [0, "transform:scale(0);opacity:0"], [T.bang + dly, "transform:scale(.005);opacity:1;animation-timing-function:cubic-bezier(.2,.7,.4,1)"],
      [T.bang + dly + 1.3, "transform:scale(1);opacity:0", TW],
    ], "fb")}/>`));
  let sparks = "";
  for (let i = 0; i < 46; i++) {
    const a = random() * Math.PI * 2, rr = 80 + random() * 320;
    sparks += `<circle r="${f1(1 + random() * 1.6)}" fill="${["#fff", "#ffd8a8", "#ff922b", "#e64980", "#9775fa"][i % 5]}" style="--x:${f1(Math.cos(a) * rr)}px;--y:${f1(Math.sin(a) * rr * 0.6)}px"/>`;
  }
  css.push(keyframes("spark", [
    [0, "transform:translate(0,0);opacity:0"], [T.bang, "transform:translate(0,0);opacity:1;animation-timing-function:cubic-bezier(.1,.8,.3,1)"],
    [T.bang + 1.4, "transform:translate(var(--x),var(--y));opacity:0", TW],
  ]));
  css.push(`.sparks circle{animation:spark ${DURATION.toFixed(3)}s linear infinite both}`);
  out.push(`<g class="sparks" transform="translate(${CX},${CY})" filter="url(#glow)">${sparks}</g>`);

  // HUD: status line per phase
  out.push(`<text x="18" y="26" class="hud">@${login}</text>`);
  const phases = [
    [0, T.appear, `${total} commits · stable`],
    [T.appear, T.pull, "⚠ gravitational anomaly detected"],
    [T.pull, T.swallowed, "spaghettifying commits…"],
    [T.swallowed, T.bang, "critical mass reached"],
    [T.bang, T.rebuilt, "✦ BIG BANG ✦"],
    [T.rebuilt, DURATION, `graph restored · ${total} commits`],
  ];
  phases.forEach(([a, b, text], i) =>
    out.push(`<text x="${W - 18}" y="26" text-anchor="end" ${anim(`st${i}`, [[0, `opacity:${a === 0 ? 1 : 0}`], [a, "opacity:1"], [b, "opacity:0"]], `hud${i === 1 || i === 3 ? " warn" : ""}`)}>${text}</text>`));

  const style = `
    .m{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .fb{transform-box:fill-box;transform-origin:center}
    .hud{font:bold 12px ${MONO};fill:#d0bfff;letter-spacing:1px}
    .warn{fill:#ffa94d}
    .lbl{font:10px ${MONO};fill:#8b949e}
    ${css.join("\n")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${login}: a black hole eats ${total} contributions</title>
  <defs>${defs.join("")}</defs>
  <style>${style}</style>
  <g clip-path="url(#frame)">
  ${out.join("\n")}
  </g>
  </svg>`;
  return [{ file: "black-hole.svg", svg }];
}
