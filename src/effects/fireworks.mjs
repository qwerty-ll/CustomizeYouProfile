// Every active day (the 36 biggest on busy profiles) launches a rocket, oldest
// on the left, that bursts over a night city; bigger days fly higher and burst wider.
// Around New Year the finale says so, and it snows.

import { MONO, TW, f1, keyframeBuilder, monthName, rng, seedFor, topDays } from "../lib.mjs";

export default function render({ login, days, weeks, total, maxCount }, options = {}) {
  const W = 860, H = 280, GROUND = H - 30;
  const random = rng(seedFor(login, 2027));
  const pick = (arr) => arr[Math.floor(random() * arr.length)];

  const activeDays = days.filter((d) => d.count > 0).length;
  const active = topDays(days, 36);
  const peak = Math.max(1, maxCount);
  const last = new Date(days.at(-1).date + "T00:00:00Z");
  const month = last.getUTCMonth(), dom = last.getUTCDate();
  const NEW_YEAR = (month === 11 && dom >= 15) || (month === 0 && dom <= 15);
  const nyYear = month === 11 ? last.getUTCFullYear() + 1 : last.getUTCFullYear();

  const PALETTES = [
    ["#ffd166", "#ff9f1c", "#fff3c4"],   // gold
    ["#ff5fa2", "#ffb3d9", "#ffffff"],   // pink
    ["#7ee8fa", "#3a86ff", "#e0fbff"],   // cyan
    ["#9dff8a", "#38e54d", "#f0ffe0"],   // green
    ["#c77dff", "#7b2ff7", "#f3e0ff"],   // violet
    ["#ff595e", "#ffca3a", "#ffffff"],   // red-gold
  ];

  // ---------- timeline ----------
  const FLY = 1.0, BURST = 1.9;
  const GAP = Math.min(0.8, Math.max(0.38, 20 / Math.max(1, active.length)));
  const rockets = active.map((d, i) => {
    const size = Math.sqrt(d.count / peak);
    return {
      d,
      x: f1(60 + (d.index / (days.length - 1)) * (W - 120) + (random() - 0.5) * 16),
      y: f1(58 + (1 - size) * 90 + random() * 14),
      tl: 0.8 + i * GAP,
      radius: 22 + 46 * size,
      level: Math.max(1, d.level),
      palette: d.level >= 4 ? pick([PALETTES[0], PALETTES[1], PALETTES[5]]) : pick(PALETTES),
      label: `${monthName(d.date)} ${Number(d.date.slice(8))} · ${d.count}`,
    };
  });
  const lastBurst = rockets.length ? rockets.at(-1).tl + FLY : 1;
  // grand finale: a volley around the title
  const FINALE = lastBurst + 1.6;
  const volley = Array.from({ length: 7 }, (_, k) => ({
    x: f1(90 + k * ((W - 180) / 6) + (random() - 0.5) * 30),
    y: f1(50 + random() * 40 + (k % 2) * 30),
    tl: FINALE - FLY + k * 0.07,
    radius: 40 + random() * 25,
    level: 4,
    palette: PALETTES[k % PALETTES.length],
  }));
  const TITLE_IN = FINALE + 0.3;
  const DURATION = TITLE_IN + 4.2;
  const keyframes = keyframeBuilder(DURATION);
  const css = [];
  const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);
  const EASE_OUT = "animation-timing-function:cubic-bezier(.15,.7,.35,1)";

  // ---------- scene ----------
  const defs = [], out = [];
  defs.push(`<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03040d"/><stop offset=".6" stop-color="#0d0b2b"/><stop offset="1" stop-color="#2a1646"/></linearGradient>`);
  defs.push(`<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<filter id="bloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>`);
  defs.push(`<linearGradient id="trail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#ff9f1c" stop-opacity="0"/></linearGradient>`);
  defs.push(`<linearGradient id="title" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd166"/><stop offset=".5" stop-color="#ff5fa2"/><stop offset="1" stop-color="#7ee8fa"/></linearGradient>`);
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>`);
  out.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);

  // stars
  let stars = "";
  for (let i = 0; i < 80; i++)
    stars += `<circle cx="${f1(random() * W)}" cy="${f1(random() * (GROUND - 60))}" r="${random() < 0.12 ? 1.3 : 0.7}" fill="#fff" style="animation:tw ${f1(1.5 + random() * 3)}s ease-in-out ${f1(-random() * 4)}s infinite alternate"/>`;
  css.push(`@keyframes tw{from{opacity:.15}to{opacity:.9}}`);
  out.push(stars);

  // sky flashes (one per burst)
  const flashes = [];

  // bursts
  const bursts = [];
  function burst(r, i, withLabel) {
    const tb = r.tl + FLY;
    const [c1, c2, c3] = r.palette;
    // rocket
    const drift = f1((random() - 0.5) * 20);
    bursts.push(`<g ${anim(`r${i}`, [
      [0, `opacity:0;transform:translate(${r.x - drift}px,${GROUND}px)`],
      [r.tl, `opacity:1;transform:translate(${r.x - drift}px,${GROUND}px);${EASE_OUT}`],
      [tb, `opacity:1;transform:translate(${r.x}px,${r.y}px)`, TW],
      [tb + 0.02, `opacity:0;transform:translate(${r.x}px,${r.y}px)`],
    ])}><line x1="0" y1="0" x2="0" y2="16" stroke="url(#trail)" stroke-width="2" stroke-linecap="round"/><circle r="2" fill="#fff8e0" filter="url(#glow)"/></g>`);

    // particles share one keyframe per burst, each flies to its own --x/--y
    const n = 16 + r.level * 6;
    const rings = r.level >= 3 ? [[1, c1], [0.55, c2]] : [[1, c1]];
    const parts = [];
    for (const [scale, color] of rings) {
      for (let k = 0; k < n * scale; k++) {
        const a = (k / (n * scale)) * Math.PI * 2 + random() * 0.2;
        const rr = r.radius * scale * (0.85 + random() * 0.3);
        parts.push(`<circle r="${f1(1.3 + random() * 0.9)}" fill="${color}" style="--x:${f1(Math.cos(a) * rr)}px;--y:${f1(Math.sin(a) * rr)}px"/>`);
      }
    }
    const fall = 14 + r.radius * 0.25;
    css.push(keyframes(`b${i}`, [
      [0, "opacity:0;transform:translate(0,0) scale(1)"],
      [tb, `opacity:1;transform:translate(0,0) scale(1);${EASE_OUT}`],
      [tb + 0.95, "opacity:1;transform:translate(var(--x),var(--y)) scale(1)", TW],
      [tb + BURST, `opacity:0;transform:translate(var(--x),calc(var(--y) + ${f1(fall)}px)) scale(.3)`, TW],
    ]));
    css.push(`.b${i}>circle{animation-name:b${i}}`);
    bursts.push(`<g transform="translate(${r.x},${r.y})" filter="url(#glow)"><g class="bp b${i}">${parts.join("")}</g>`);

    // glitter that crackles at the end of big bursts
    if (r.level >= 4) {
      let sparks = "";
      for (let k = 0; k < 14; k++) {
        const a = random() * Math.PI * 2, rr = r.radius * (0.4 + random() * 0.7);
        sparks += `<circle cx="${f1(Math.cos(a) * rr)}" cy="${f1(Math.sin(a) * rr + fall * 0.6)}" r="1" fill="${c3}" style="animation:crackle .18s steps(2) ${f1(-random())}s infinite"/>`;
      }
      bursts.push(`<g ${anim(`s${i}`, [[0, "opacity:0"], [tb + 1.0, "opacity:0"], [tb + 1.2, "opacity:1", TW], [tb + BURST + 0.3, "opacity:0", TW]])}>${sparks}</g>`);
    }
    // core flash
    bursts.push(`<circle r="${f1(r.radius * 0.45)}" fill="${c3}" filter="url(#bloom)" ${anim(`f${i}`, [
      [0, "opacity:0;transform:scale(.2)"], [tb, "opacity:.9;transform:scale(.2)"], [tb + 0.35, "opacity:0;transform:scale(1.3)", TW],
    ], "fb")}/>`);
    if (withLabel)
      bursts.push(`<text y="${f1(r.radius + 20)}" fill="${c1}" ${anim(`l${i}`, [
        [0, "opacity:0"], [tb + 0.25, "opacity:0"], [tb + 0.5, "opacity:.95", TW], [tb + BURST, "opacity:0", TW],
      ], "lbl")}>${r.label}</text>`);
    bursts.push(`</g>`);

    flashes.push(`<rect width="${W}" height="${H}" fill="${c1}" ${anim(`sf${i}`, [
      [0, "opacity:0"], [tb, `opacity:${f1(0.05 + r.level * 0.025)}`], [tb + 0.6, "opacity:0", TW],
    ])}/>`);
  }
  rockets.forEach((r, i) => burst(r, i, true));
  volley.forEach((r, k) => burst(r, `v${k}`, false));
  css.push(`@keyframes crackle{0%{opacity:1}50%{opacity:0}}`);
  out.push(flashes.join(""));
  out.push(bursts.join("\n"));

  // snow for the New Year edition
  if (NEW_YEAR) {
    let snow = "";
    for (let i = 0; i < 40; i++) {
      const d = 5 + random() * 6;
      snow += `<circle cx="${f1(random() * W)}" cy="-6" r="${f1(0.8 + random() * 1.4)}" fill="#fff" opacity="${f1(0.5 + random() * 0.5)}" style="animation:snow ${f1(d)}s linear ${f1(-random() * d)}s infinite"/>`;
    }
    css.push(`@keyframes snow{to{transform:translate(-30px,${H + 10}px)}}`);
    out.push(snow);
  }

  // night city
  let city = "", x = -10;
  while (x < W + 10) {
    const bw = 22 + random() * 38, bh = 18 + random() * (random() < 0.2 ? 70 : 42);
    city += `<rect x="${f1(x)}" y="${f1(GROUND - bh)}" width="${f1(bw)}" height="${f1(bh + 40)}" fill="#0a0c20"/>`;
    for (let wy = GROUND - bh + 6; wy < GROUND - 4; wy += 8)
      for (let wx = x + 5; wx < x + bw - 6; wx += 7)
        if (random() < 0.28)
          city += `<rect x="${f1(wx)}" y="${f1(wy)}" width="3" height="4" fill="${random() < 0.8 ? "#ffd98a" : "#9ad8ff"}" opacity=".85"${random() < 0.15 ? ` style="animation:tw ${f1(2 + random() * 5)}s ease-in-out ${f1(-random() * 5)}s infinite alternate"` : ""}/>`;
    x += bw + 2 + random() * 6;
  }
  out.push(city);
  out.push(`<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="#05060f"/>`);
  out.push(`<rect y="${GROUND}" width="${W}" height="1" fill="#ff9f1c" opacity=".25"/>`);

  // HUD + title
  out.push(`<text x="18" y="24" class="hud">@${login}</text>`);
  out.push(`<text x="${W - 18}" y="24" class="hud" text-anchor="end">${activeDays} days · ${total} commits</text>`);
  const title = NEW_YEAR ? `HAPPY NEW YEAR ${nyYear}` : `${total} COMMITS`;
  const sub = NEW_YEAR ? `${total} commits to celebrate` : `${monthName(days[0].date)} ${days[0].date.slice(0, 4)} → ${monthName(days.at(-1).date)} ${days.at(-1).date.slice(0, 4)} · ${active.length < activeDays ? `rockets for the ${active.length} biggest days` : "one rocket per active day"}`;
  out.push(`<g ${anim("title", [
    [0, "opacity:0;transform:scale(.85)"], [TITLE_IN, "opacity:0;transform:scale(.85)"],
    [TITLE_IN + 0.7, "opacity:1;transform:scale(1)", TW], [DURATION - 0.6, "opacity:1;transform:scale(1)"], [DURATION, "opacity:0;transform:scale(1.05)", TW],
  ], "fb")}>
    <text x="${W / 2}" y="${H / 2 + 6}" text-anchor="middle" class="big" fill="url(#title)" filter="url(#glow)">${title}</text>
    <text x="${W / 2}" y="${H / 2 + 32}" text-anchor="middle" class="hud">${sub}</text>
  </g>`);

  const style = `
    .m,.bp>circle{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .fb{transform-box:fill-box;transform-origin:center}
    .hud{font:bold 12px ${MONO};fill:#cfc6ff;letter-spacing:1px;opacity:.85}
    .lbl{font:bold 11px ${MONO};text-anchor:middle;letter-spacing:.5px}
    .big{font:bold 38px ${MONO};letter-spacing:4px}
    ${css.join("\n")}
  `;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${login}: fireworks for ${total} contributions</title>
  <defs>${defs.join("")}</defs>
  <style>${style}</style>
  <g clip-path="url(#frame)">
  ${out.join("\n")}
  </g>
  </svg>`;
  return [{ file: "fireworks.svg", svg }];
}
