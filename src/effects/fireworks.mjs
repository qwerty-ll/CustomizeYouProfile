// A fireworks show over a night city: one rocket per month (bigger month =
// bigger, higher burst; an empty month just fizzles), then a finale rocket whose
// sparks fly into place and draw the whole contribution graph in the sky before
// falling as embers. Around New Year (Dec 15 – Jan 15) the title says so and it snows.

import { MONO, TW, f1, keyframeBuilder, monthsOf, rng, seedFor } from "../lib.mjs";

export default function render({ login, days, weeks, total }) {
  const W = 860, H = 300, GROUND = H - 30;
  const random = rng(seedFor(login, 2027));
  const months = monthsOf(days);
  const maxMonth = Math.max(1, ...months.map((m) => m.total));

  const last = new Date(days.at(-1).date + "T00:00:00Z");
  const NEW_YEAR = (last.getUTCMonth() === 11 && last.getUTCDate() >= 15) || (last.getUTCMonth() === 0 && last.getUTCDate() <= 15);
  const nyYear = last.getUTCMonth() === 11 ? last.getUTCFullYear() + 1 : last.getUTCFullYear();

  const PALETTES = [
    ["#ffd166", "#ff9f1c", "#fff3c4"], ["#ff5fa2", "#ffb3d9", "#ffffff"], ["#7ee8fa", "#3a86ff", "#e0fbff"],
    ["#9dff8a", "#38e54d", "#f0ffe0"], ["#c77dff", "#7b2ff7", "#f3e0ff"], ["#ff595e", "#ffca3a", "#ffffff"],
  ];
  const GRID = ["#2a3150", "#1f9d55", "#2fd06b", "#6bff8f", "#d4ffc9"];     // graph written in sparks

  // ---------- timeline ----------
  const FLY = 1.0, BURST = 1.9, GAP = 0.62;
  const rockets = months.map((m, i) => {
    const size = m.total / maxMonth;
    return {
      x: f1(70 + (i / Math.max(1, months.length - 1)) * (W - 140) + (random() - 0.5) * 20),
      y: f1(62 + (1 - Math.sqrt(size)) * 70 + random() * 16),
      tl: 0.6 + i * GAP,
      radius: m.total ? 26 + 48 * Math.sqrt(size) : 10,
      n: m.total ? Math.round(18 + 26 * Math.sqrt(size)) : 7,
      rings: size > 0.5 ? 2 : 1,
      palette: m.total ? PALETTES[i % PALETTES.length] : ["#8b8fa3", "#5b5f73", "#c9ccd6"],
      label: `${m.name}${m.total ? ` · ${m.total}` : ""}`,
      glitter: size > 0.75,
    };
  });
  const T_FINALE = rockets.at(-1).tl + FLY + 1.3;     // finale rocket launches
  const T_BANG = T_FINALE + FLY;                      // …and bursts into the graph
  const T_FORMED = T_BANG + 1.4;
  const T_FALL = T_FORMED + 3.6;
  const DURATION = T_FALL + 2.2;
  const keyframes = keyframeBuilder(DURATION);
  const css = [];
  const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);
  const EASE_OUT = "animation-timing-function:cubic-bezier(.15,.7,.35,1)";
  const EASE_IN = "animation-timing-function:cubic-bezier(.55,0,.9,.5)";

  // ---------- scene ----------
  const defs = [], out = [];
  defs.push(`<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03040d"/><stop offset=".6" stop-color="#0d0b2b"/><stop offset="1" stop-color="#2a1646"/></linearGradient>`);
  defs.push(`<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<filter id="bloom" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>`);
  defs.push(`<linearGradient id="trail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#ff9f1c" stop-opacity="0"/></linearGradient>`);
  defs.push(`<linearGradient id="title" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd166"/><stop offset=".5" stop-color="#ff5fa2"/><stop offset="1" stop-color="#7ee8fa"/></linearGradient>`);
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>`);
  out.push(`<rect width="${W}" height="${H}" fill="url(#sky)"/>`);
  let stars = "";
  for (let i = 0; i < 80; i++)
    stars += `<circle cx="${f1(random() * W)}" cy="${f1(random() * (GROUND - 60))}" r="${random() < 0.12 ? 1.3 : 0.7}" fill="#fff" style="animation:tw ${f1(1.5 + random() * 3)}s ease-in-out ${f1(-random() * 4)}s infinite alternate"/>`;
  css.push(`@keyframes tw{from{opacity:.15}to{opacity:.9}}@keyframes crackle{0%{opacity:1}50%{opacity:0}}`);
  out.push(stars);

  const flashes = [], shows = [];
  function rocket(r, id) {
    const tb = r.tl + FLY, drift = f1((random() - 0.5) * 20);
    shows.push(`<g ${anim(`r${id}`, [
      [0, `opacity:0;transform:translate(${r.x - drift}px,${GROUND}px)`],
      [r.tl, `opacity:1;transform:translate(${r.x - drift}px,${GROUND}px);${EASE_OUT}`],
      [tb, `opacity:1;transform:translate(${r.x}px,${r.y}px)`, TW],
      [tb + 0.02, `opacity:0;transform:translate(${r.x}px,${r.y}px)`],
    ])}><line x1="0" y1="0" x2="0" y2="16" stroke="url(#trail)" stroke-width="2" stroke-linecap="round"/><circle r="2" fill="#fff8e0" filter="url(#glow)"/></g>`);
    return tb;
  }
  function burst(r, id) {
    const tb = rocket(r, id);
    const [c1, c2, c3] = r.palette;
    const parts = [];
    for (let ring = 0; ring < r.rings; ring++) {
      const scale = ring ? 0.55 : 1, color = ring ? c2 : c1, n = Math.round(r.n * scale);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + random() * 0.2, rr = r.radius * scale * (0.85 + random() * 0.3);
        parts.push(`<circle r="${f1(1.2 + random() * 0.9)}" fill="${color}" style="--x:${f1(Math.cos(a) * rr)}px;--y:${f1(Math.sin(a) * rr)}px"/>`);
      }
    }
    const fall = 14 + r.radius * 0.25;
    css.push(keyframes(`b${id}`, [
      [0, "opacity:0;transform:translate(0,0) scale(1)"],
      [tb, `opacity:1;transform:translate(0,0) scale(1);${EASE_OUT}`],
      [tb + 0.95, "opacity:1;transform:translate(var(--x),var(--y)) scale(1)", TW],
      [tb + BURST, `opacity:0;transform:translate(var(--x),calc(var(--y) + ${f1(fall)}px)) scale(.3)`, TW],
    ]));
    css.push(`.b${id}>circle{animation-name:b${id}}`);
    shows.push(`<g transform="translate(${r.x},${r.y})"><g class="bp b${id}" filter="url(#glow)">${parts.join("")}</g>`);
    if (r.glitter) {
      let sparks = "";
      for (let k = 0; k < 14; k++) {
        const a = random() * Math.PI * 2, rr = r.radius * (0.4 + random() * 0.7);
        sparks += `<circle cx="${f1(Math.cos(a) * rr)}" cy="${f1(Math.sin(a) * rr + fall * 0.6)}" r="1" fill="${c3}" style="animation:crackle .18s steps(2) ${f1(-random())}s infinite"/>`;
      }
      shows.push(`<g ${anim(`s${id}`, [[0, "opacity:0"], [tb + 1.0, "opacity:0"], [tb + 1.2, "opacity:1", TW], [tb + BURST + 0.3, "opacity:0", TW]])}>${sparks}</g>`);
    }
    shows.push(`<circle r="${f1(r.radius * 0.45)}" fill="${c3}" filter="url(#bloom)" ${anim(`f${id}`, [
      [0, "opacity:0;transform:scale(.2)"], [tb, "opacity:.9;transform:scale(.2)"], [tb + 0.35, "opacity:0;transform:scale(1.3)", TW],
    ], "fb")}/>`);
    shows.push(`<text y="${f1(r.radius + 18)}" fill="${c1}" ${anim(`l${id}`, [
      [0, "opacity:0"], [tb + 0.25, "opacity:0"], [tb + 0.5, "opacity:.95", TW], [tb + BURST, "opacity:0", TW],
    ], "lbl")}>${r.label}</text>`);
    shows.push(`</g>`);
    flashes.push(`<rect width="${W}" height="${H}" fill="${c1}" ${anim(`sf${id}`, [
      [0, "opacity:0"], [tb, `opacity:${r.radius > 50 ? 0.12 : 0.06}`], [tb + 0.6, "opacity:0", TW],
    ])}/>`);
  }
  rockets.forEach((r, i) => burst(r, i));

  // ---------- finale: the contribution graph written in sparks ----------
  const STEP = 12, GX = (W - weeks * STEP) / 2, GY = 50;
  const BX = W / 2, BY = GY + 3.5 * STEP;
  rocket({ x: BX, y: BY, tl: T_FINALE }, "fin");
  let sparks = "";
  for (const d of days) {
    const x = GX + d.col * STEP + STEP / 2 - BX, y = GY + d.row * STEP + STEP / 2 - BY;
    const r = d.level ? 2 + d.level * 0.35 : 1.3;
    const twinkle = d.level ? ` style="animation:tw ${f1(0.8 + random() * 1.6)}s ease-in-out ${f1(-random() * 2)}s infinite alternate"` : "";
    sparks += `<g style="--x:${f1(x)}px;--y:${f1(y)}px;--f:${f1(50 + random() * 110)}px"><circle r="${f1(r)}" fill="${GRID[d.level]}"${twinkle}><title>${d.count} on ${d.date}</title></circle></g>`;
  }
  css.push(keyframes("spark", [
    [0, "opacity:0;transform:translate(0,0) scale(0)"],
    [T_BANG, `opacity:1;transform:translate(0,0) scale(1);${EASE_OUT}`],
    [T_FORMED, "opacity:1;transform:translate(var(--x),var(--y)) scale(1)", TW],
    [T_FALL, `opacity:1;transform:translate(var(--x),var(--y)) scale(1);${EASE_IN}`],
    [T_FALL + 1.8, "opacity:0;transform:translate(var(--x),calc(var(--y) + var(--f))) scale(.4)", TW],
  ]));
  css.push(`.graph>g{animation:spark ${DURATION.toFixed(3)}s linear infinite both}`);
  shows.push(`<g transform="translate(${BX},${BY})"><g class="graph" filter="url(#glow)">${sparks}</g>
    <circle r="60" fill="#fff3c4" filter="url(#bloom)" ${anim("finflash", [[0, "opacity:0;transform:scale(.2)"], [T_BANG, "opacity:1;transform:scale(.2)"], [T_BANG + 0.5, "opacity:0;transform:scale(1.6)", TW]], "fb")}/></g>`);
  flashes.push(`<rect width="${W}" height="${H}" fill="#fff3c4" ${anim("finsky", [[0, "opacity:0"], [T_BANG, "opacity:.22"], [T_BANG + 0.8, "opacity:0", TW]])}/>`);

  out.push(flashes.join(""));
  out.push(shows.join("\n"));

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
    const bw = 22 + random() * 38, bh = 18 + random() * (random() < 0.2 ? 60 : 38);
    city += `<rect x="${f1(x)}" y="${f1(GROUND - bh)}" width="${f1(bw)}" height="${f1(bh + 40)}" fill="#0a0c20"/>`;
    for (let wy = GROUND - bh + 6; wy < GROUND - 4; wy += 8)
      for (let wx = x + 5; wx < x + bw - 6; wx += 7)
        if (random() < 0.28)
          city += `<rect x="${f1(wx)}" y="${f1(wy)}" width="3" height="4" fill="${random() < 0.8 ? "#ffd98a" : "#9ad8ff"}" opacity=".85"${random() < 0.15 ? ` style="animation:tw ${f1(2 + random() * 5)}s ease-in-out ${f1(-random() * 5)}s infinite alternate"` : ""}/>`;
    x += bw + 2 + random() * 6;
  }
  out.push(city);
  out.push(`<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="#05060f"/><rect y="${GROUND}" width="${W}" height="1" fill="#ff9f1c" opacity=".25"/>`);

  // HUD + title under the spark graph
  out.push(`<text x="18" y="24" class="hud">@${login}</text>`);
  out.push(`<text x="${W - 18}" y="24" class="hud" text-anchor="end">${NEW_YEAR ? `New Year ${nyYear}` : "one rocket per month"}</text>`);
  const first = months[0], lastM = months.at(-1);
  const title = NEW_YEAR ? `HAPPY NEW YEAR ${nyYear}` : `${total} CONTRIBUTIONS`;
  out.push(`<g ${anim("title", [
    [0, "opacity:0;transform:translateY(8px)"], [T_FORMED - 0.3, "opacity:0;transform:translateY(8px)"],
    [T_FORMED + 0.4, "opacity:1;transform:translateY(0)", TW], [T_FALL + 0.6, "opacity:1;transform:translateY(0)"], [T_FALL + 1.4, "opacity:0;transform:translateY(0)", TW],
  ])}>
    <text x="${W / 2}" y="${GY + 7 * STEP + 38}" text-anchor="middle" class="big" fill="url(#title)" filter="url(#glow)">${title}</text>
    <text x="${W / 2}" y="${GY + 7 * STEP + 58}" text-anchor="middle" class="hud">${first.name} ${first.year} → ${lastM.name} ${lastM.year}${NEW_YEAR ? ` · ${total} contributions` : ""}</text>
  </g>`);

  const style = `
    .m,.bp>circle{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .fb{transform-box:fill-box;transform-origin:center}
    .hud{font:bold 12px ${MONO};fill:#cfc6ff;letter-spacing:1px;opacity:.85}
    .lbl{font:bold 11px ${MONO};text-anchor:middle;letter-spacing:.5px}
    .big{font:bold 30px ${MONO};letter-spacing:4px}
    ${css.join("\n")}`;

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
