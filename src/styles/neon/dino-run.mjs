// Generates an animated synthwave SVG: a T-rex runs through the last year of
// contributions and jumps over commit-cacti (taller cactus = more commits).
// Seasons change as it runs: autumn leaves, winter snow under the moon,
// spring petals, summer fireflies.

import { TW, keyframeBuilder } from "../../lib.mjs";
import { BODY, LEGS, SANTA_HAT, obstacleKit, pixels } from "../../scenes/dino-obstacles.mjs";
import { planDino } from "../../scenes/dino-plan.mjs";

export default function render({ login, days: allDays, total, maxCount }, options = {}) {
  const { W, H, GROUND, DX, PX, DINO_W, DINO_H, DAY, V, FONT, random, days, underDino, groups, lastDayT, RUN_END, DURATION, prefix } =
    planDino({ login, days: allDays, maxCount });

  // ---------- palette ----------
  const CACTUS = [null, ["#8dffc0", "#11b87a"], ["#5ff9ea", "#0a8fc0"], ["#ffe96e", "#ff7a1f"], ["#ff8ae0", "#b01fe0"]];
  const SKY = {
    autumn: ["#1b0b3a", "#6b1f5c", "#ff7b4a"],
    winter: ["#030718", "#0f1d52", "#3b4fa8"],
    spring: ["#1a1446", "#6a3aa6", "#ff9ec4"],
    summer: ["#22093f", "#b0175e", "#ffb347"],
  };
  const SEASON_OF = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"];
  const monthOf = (date) => Number(date.slice(5, 7)) - 1;
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const keyframes = keyframeBuilder(DURATION);
  const css = [];
  const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);

  // ---------- seasons ----------
  const segments = [{ season: SEASON_OF[monthOf(days[0].date)], t: 0 }];
  const monthStarts = [{ label: `${MONTHS[monthOf(days[0].date)]} ${days[0].date.slice(0, 4)}`, t: 0 }];
  for (const d of days) {
    if (!d.date.endsWith("-01")) continue;
    const m = monthOf(d.date);
    monthStarts.push({ label: `${MONTHS[m]} ${d.date.slice(0, 4)}`, t: underDino(d.wx), wx: d.wx, short: MONTHS[m] });
    if (SEASON_OF[m] !== segments.at(-1).season) segments.push({ season: SEASON_OF[m], t: underDino(d.wx) });
  }
  const FADE = 1.4;
  function seasonFrames(visible, on = 1, off = 0) {
    const val = (s) => `opacity:${visible(s) ? on : off}`;
    const frames = [[0, val(segments[0].season)]];
    for (let k = 1; k < segments.length; k++) {
      const a = val(segments[k - 1].season), b = val(segments[k].season);
      if (a !== b) frames.push([segments[k].t, a], [segments[k].t + FADE, b, TW]);
    }
    return frames;
  }

  // ---------- helpers ----------
  const f = (n) => +n.toFixed(1);
  function smoothPath(points, bottom) {
    let d = `M${points[0][0]} ${bottom}L${points[0][0]} ${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[i + 1];
      const mx = (x0 + x1) / 2;
      d += `C${f(mx)} ${f(y0)} ${f(mx)} ${f(y1)} ${f(x1)} ${f(y1)}`;
    }
    return d + `L${points.at(-1)[0]} ${bottom}Z`;
  }
  function ridge(period, step, base, amp, sharp) {
    const pts = [];
    for (let x = 0; x <= period; x += step) pts.push([x, base - random() * amp]);
    pts[pts.length - 1] = [period, pts[0][1]];
    if (sharp) return `M0 ${GROUND}` + pts.map(([x, y]) => `L${x} ${f(y)}`).join("") + `L${period} ${GROUND}Z`;
    return smoothPath(pts, GROUND);
  }
  // A layer that scrolls left forever at `speed`, seamlessly, independent of the main loop.
  function parallax(name, period, speed, content) {
    css.push(`@keyframes ${name}{from{transform:translateX(0)}to{transform:translateX(-${period}px)}}`);
    return `<g style="animation:${name} ${(period / speed).toFixed(3)}s linear infinite">${content}<g transform="translate(${period},0)">${content}</g></g>`;
  }

  // ---------- scene ----------
  const out = [];
  const defs = [];

  // sky layers per season
  defs.push(`<filter id="glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`);
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>`);
  out.push(`<rect width="${W}" height="${H}" fill="#0b0620"/>`);
  for (const [season, [a, b, c]] of Object.entries(SKY)) {
    defs.push(`<linearGradient id="sky-${season}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".62" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`);
    out.push(`<rect width="${W}" height="${GROUND}" fill="url(#sky-${season})" ${anim(`sky-${season}`, seasonFrames((s) => s === season))}/>`);
  }

  // stars (bright in winter)
  const stars = [];
  for (let i = 0; i < 70; i++) {
    const r = random() < 0.15 ? 1.4 : 0.8;
    stars.push(`<circle cx="${f(random() * W)}" cy="${f(8 + random() * (GROUND - 80))}" r="${r}" fill="#fff" style="animation:twinkle ${f(1.5 + random() * 3)}s ease-in-out ${f(-random() * 4)}s infinite alternate"/>`);
  }
  css.push(`@keyframes twinkle{from{opacity:.2}to{opacity:1}}`);
  out.push(`<g ${anim("stars", seasonFrames((s) => s === "winter", 1, 0.35))}>${stars.join("")}</g>`);

  // synthwave sun, swapped for the moon in winter
  const SUN_X = W * 0.73, SUN_Y = GROUND - 56, SUN_R = 50;
  defs.push(`<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff27a"/><stop offset=".5" stop-color="#ff9a3d"/><stop offset="1" stop-color="#ff2f92"/></linearGradient>`);
  const stripes = [];
  for (let i = 0, y = SUN_Y + 4; y < SUN_Y + SUN_R; i++) {
    const hgt = 1.5 + i * 1.1;
    stripes.push(`<rect x="${SUN_X - SUN_R}" y="${f(y)}" width="${SUN_R * 2}" height="${f(hgt)}" fill="#000"/>`);
    y += hgt + 5 - i * 0.5;
  }
  defs.push(`<mask id="sunmask"><rect width="${W}" height="${H}" fill="#fff"/>${stripes.join("")}</mask>`);
  out.push(`<g ${anim("sun", seasonFrames((s) => s !== "winter"))}>
    <circle cx="${SUN_X}" cy="${SUN_Y}" r="${SUN_R + 22}" fill="#ff4fa0" opacity=".35" filter="url(#soft)"/>
    <circle cx="${SUN_X}" cy="${SUN_Y}" r="${SUN_R}" fill="url(#sun)" mask="url(#sunmask)"/>
  </g>`);
  defs.push(`<mask id="crescent"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="${SUN_X + 10}" cy="72" r="20" fill="#000"/></mask>`);
  out.push(`<g ${anim("moon", seasonFrames((s) => s === "winter"))}>
    <circle cx="${SUN_X}" cy="78" r="34" fill="#9fb4ff" opacity=".35" filter="url(#soft)"/>
    <circle cx="${SUN_X}" cy="78" r="22" fill="#eef1ff" mask="url(#crescent)"/>
  </g>`);

  // mountains and hills (parallax)
  defs.push(`<linearGradient id="mnt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2380"/><stop offset="1" stop-color="#1c0d3d"/></linearGradient>`);
  defs.push(`<linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1356"/><stop offset="1" stop-color="#100726"/></linearGradient>`);
  const mnt = ridge(W, 48, GROUND - 20, 40, true);
  out.push(parallax("far", W, V * 0.12, `<path d="${mnt}" fill="url(#mnt)" stroke="#ff6ad5" stroke-opacity=".45" stroke-width="1"/>`));
  const hill = ridge(W, 86, GROUND - 8, 30, false);
  out.push(parallax("near", W, V * 0.35, `<path d="${hill}" fill="url(#hill)" stroke="#6ae8ff" stroke-opacity=".3" stroke-width="1"/>`));

  // season particles
  const particles = { autumn: [], winter: [], spring: [], summer: [] };
  let pid = 0;
  function faller(season, count, draw, { spin = 0, drift = 80, dur = [5, 9] } = {}) {
    for (let i = 0; i < count; i++) {
      const name = `pt${pid++}`, d = dur[0] + random() * (dur[1] - dur[0]);
      const x = random() * (W + drift), rot = spin ? (random() < 0.5 ? -1 : 1) * spin : 0;
      css.push(`@keyframes ${name}{from{transform:translate(0,0) rotate(0)}to{transform:translate(-${f(drift + random() * 40)}px,${GROUND - 30}px) rotate(${rot}deg)}}`);
      particles[season].push(`<g style="animation:${name} ${f(d)}s linear ${f(-random() * d)}s infinite;transform-box:fill-box;transform-origin:center">${draw(f(x), 26)}</g>`);
    }
  }
  faller("winter", 34, (x, y) => `<circle cx="${x}" cy="${y}" r="${f(0.8 + random() * 1.4)}" fill="#fff" opacity="${f(0.55 + random() * 0.45)}"/>`, { drift: 50, dur: [4, 8] });
  faller("autumn", 16, (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="1.8" fill="${["#ff8a3d", "#ffb84d", "#e8453c"][pid % 3]}"/>`, { spin: 540, drift: 110, dur: [5, 9] });
  faller("spring", 18, (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="1.5" fill="${["#ffc4dd", "#ff9ec4", "#fff0f6"][pid % 3]}"/>`, { spin: 360, drift: 130, dur: [6, 10] });
  for (let i = 0; i < 18; i++) {
    const name = `pt${pid++}`, d = 4 + random() * 4;
    const pts = [0, 1, 2].map(() => `${f((random() - 0.5) * 40)}px,${f((random() - 0.5) * 24)}px`);
    css.push(`@keyframes ${name}{0%,100%{transform:translate(0,0);opacity:0}25%{transform:translate(${pts[0]});opacity:1}50%{transform:translate(${pts[1]});opacity:.2}75%{transform:translate(${pts[2]});opacity:1}}`);
    particles.summer.push(`<circle cx="${f(random() * W)}" cy="${f(70 + random() * (GROUND - 85))}" r="1.6" fill="#fff59a" filter="url(#glow)" style="animation:${name} ${f(d)}s ease-in-out ${f(-random() * d)}s infinite"/>`);
  }
  for (const [season, items] of Object.entries(particles))
    out.push(`<g ${anim(`fx-${season}`, seasonFrames((s) => s === season))}>${items.join("")}</g>`);

  // ground: retro floor + neon horizon
  defs.push(`<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1045"/><stop offset="1" stop-color="#060211"/></linearGradient>`);
  defs.push(`<linearGradient id="horizon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00f0ff"/><stop offset=".5" stop-color="#ff3df2"/><stop offset="1" stop-color="#00f0ff"/></linearGradient>`);
  out.push(`<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="url(#ground)"/>`);
  [[7, 0.35], [15, 0.25], [26, 0.17], [40, 0.1]].forEach(([dy, o]) =>
    out.push(`<rect y="${GROUND + dy}" width="${W}" height="1" fill="#ff3df2" opacity="${o}"/>`));
  const pebbles = (n, y0, y1, size, color, op) => {
    let s = "";
    for (let i = 0; i < n; i++) s += `<rect x="${f(random() * W)}" y="${f(y0 + random() * (y1 - y0))}" width="${f(size * (1 + random() * 2))}" height="${size}" rx="${size / 2}" fill="${color}" opacity="${op}"/>`;
    return s;
  };
  out.push(parallax("pebbles", W, V, pebbles(40, GROUND + 3, GROUND + 11, 1.5, "#8f7cff", 0.55)));
  out.push(parallax("pebbles2", W, V * 1.6, pebbles(22, GROUND + 18, H - 6, 2, "#6ae8ff", 0.25)));
  out.push(`<rect y="${GROUND - 1}" width="${W}" height="2" fill="url(#horizon)" filter="url(#glow)"/>`);

  // ---------- world: cacti, month markers, score popups ----------
  const world = [];
  for (const m of monthStarts.slice(1)) {
    world.push(`<rect x="${m.wx}" y="${GROUND + 2}" width="1" height="7" fill="#b9a8ff" opacity=".6"/>`);
    world.push(`<text x="${m.wx + 4}" y="${GROUND + 24}" class="gl">${m.short}</text>`);
  }
  CACTUS.forEach((c, lvl) => c && defs.push(
    `<linearGradient id="cg${lvl}" gradientUnits="userSpaceOnUse" x1="0" y1="${GROUND - 60}" x2="0" y2="${GROUND}"><stop offset="0" stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>`));

  const modes = options.modes ?? {};
  const kit = obstacleKit(GROUND, { cactusFill: (level) => `url(#cg${level})`, glow: true, highlight: true });
  defs.push(...kit.defs);
  css.push(...kit.css);
  const obstacle = (c) => kit.obstacle(c, modes);

  groups.forEach((g, i) => {
    // cacti dim once jumped
    world.push(`<g ${anim(`g${i}`, [[0, "opacity:1"], [g.tMid, "opacity:1"], [g.tDown + 0.3, "opacity:.38", TW], [DURATION, "opacity:.38"]])}>${g.cacti.map(obstacle).join("")}</g>`);
    const [top] = CACTUS[g.level];
    world.push(`<text x="${f(g.gx + g.gw / 2)}" y="${GROUND - g.maxH - 10}" fill="${top}" font-size="${12 + g.level * 1.5}" filter="url(#glow)" ${anim(`pop${i}`, [
      [0, "opacity:0;transform:translateY(0)"], [g.tMid, "opacity:1;transform:translateY(0)"],
      [g.tMid + 1.1, "opacity:0;transform:translateY(-28px)", TW], [DURATION, "opacity:0;transform:translateY(-28px)"],
    ], "pop")}>+${g.sum}</text>`);
  });
  // World x is measured from the dino's left edge.
  out.push(`<g transform="translate(${DX},0)"><g ${anim("world", [[0, "transform:translateX(0)"], [DURATION, `transform:translateX(-${f(V * DURATION)}px)`, TW]])}>${world.join("")}</g></g>`);

  // ---------- dino ----------
  defs.push(`<linearGradient id="dino" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${DINO_W}" y2="${DINO_H}"><stop offset="0" stop-color="#6ff6ff"/><stop offset="1" stop-color="#8a5cff"/></linearGradient>`);

  const dinoFrames = [[0, "transform:translate(0,0) rotate(0)"]];
  const shadowFrames = [[0, "transform:scale(1);opacity:.5"]];
  const legFrames = [[0, "opacity:1"]];
  const dust = [];
  const N = 14;
  groups.forEach((g, i) => {
    dinoFrames.push([g.tUp, "transform:translate(0,0) rotate(0)"]);
    shadowFrames.push([g.tUp, "transform:scale(1);opacity:.5"]);
    for (let k = 1; k <= N; k++) {
      const s = k / N, lift = 4 * s * (1 - s);
      const y = -g.apex * lift, rot = k === N ? 0 : -9 * (1 - 2 * s);
      dinoFrames.push([g.tUp + g.T * s, `transform:translate(0,${f(y)}px) rotate(${f(rot)}deg)`, TW]);
      shadowFrames.push([g.tUp + g.T * s, `transform:scale(${f(1 - 0.6 * lift)});opacity:${f(0.5 - 0.3 * lift)}`, TW]);
    }
    legFrames.push([g.tUp, "opacity:0"], [g.tDown, "opacity:1"]);
    for (let k = 0; k < 6; k++) {
      const tx = -(8 + random() * 26), ty = -(2 + random() * 9);
      dust.push(`<circle cx="${DX + 14 + k * 2}" cy="${GROUND - 1}" r="${f(1.2 + random() * 1.6)}" fill="#d9ccff" ${anim(`d${i}_${k}`, [
        [0, "opacity:0;transform:translate(0,0) scale(1)"], [g.tDown, "opacity:.9;transform:translate(0,0) scale(1)"],
        [g.tDown + 0.45, `opacity:0;transform:translate(${f(tx)}px,${f(ty)}px) scale(.3)`, TW], [DURATION, "opacity:0;transform:translate(0,0) scale(1)"],
      ], "fb")}/>`);
    }
  });
  const legsInverse = legFrames.map(([t, v]) => [t, v === "opacity:1" ? "opacity:0" : "opacity:1"]);
  css.push(`@keyframes legA{0%{opacity:1}50%{opacity:0}}@keyframes legB{0%{opacity:0}50%{opacity:1}}`);

  out.push(`<ellipse cx="${DX + 18}" cy="${GROUND + 2}" rx="17" ry="3.2" fill="#000" ${anim("shadow", shadowFrames, "fb")}/>`);
  out.push(dust.join(""));
  out.push(`<g transform="translate(${DX},${GROUND - DINO_H + 1})"><g class="m" style="animation-name:dino;transform-box:fill-box;transform-origin:50% 80%" filter="url(#glow)">
    <path d="${pixels(BODY, "#")}" fill="url(#dino)"/>
    <path d="${pixels(BODY, "e")}" fill="#1a0b2e"/>${modes.newYear ? SANTA_HAT : ""}
    <g ${anim("run", legFrames)}>
      <path d="${pixels(LEGS.a, "#", 14)}" fill="url(#dino)" style="animation:legA .22s steps(1) infinite"/>
      <path d="${pixels(LEGS.b, "#", 14)}" fill="url(#dino)" style="animation:legB .22s steps(1) infinite"/>
    </g>
    <path d="${pixels(LEGS.stand, "#", 14)}" fill="url(#dino)" ${anim("stand", legsInverse)}/>
  </g></g>`);
  css.push(keyframes("dino", dinoFrames));

  // ---------- HUD ----------
  const maxDay = maxCount;
  const pad = (n) => String(n).padStart(5, "0");
  out.push(`<rect width="${W}" height="44" fill="#07031a" opacity=".35"/>`);
  out.push(`<text x="20" y="25" class="hud"><tspan fill="#ff8ae0">@</tspan>${login}</text>`);
  monthStarts.forEach((m, i) => {
    const end = monthStarts[i + 1]?.t ?? DURATION;
    out.push(`<text x="${W / 2}" y="25" text-anchor="middle" ${anim(`mo${i}`, [
      [0, `opacity:${i === 0 ? 1 : 0}`], [m.t, "opacity:1"], [end, "opacity:0"],
    ], "hud")}>${m.label}</text>`);
  });
  out.push(`<text x="${W - 110}" y="25" text-anchor="end" class="hud dim">HI ${pad(maxDay)}</text>`);
  const scores = [{ t: 0, v: 0 }];
  groups.forEach((g) => scores.push({ t: g.tMid, v: prefix[g.cacti.at(-1).index] }));
  if (prefix.at(-1) > scores.at(-1).v) scores.push({ t: Math.max(lastDayT, scores.at(-1).t + 0.3), v: prefix.at(-1) });
  scores.forEach((s, i) => {
    const end = scores[i + 1]?.t ?? DURATION;
    const frames = i === 0
      ? [[0, "opacity:1;transform:scale(1)"], [end, "opacity:0;transform:scale(1)"]]
      : [[0, "opacity:0;transform:scale(1.35)"], [s.t, "opacity:1;transform:scale(1.35)"], [s.t + 0.3, "opacity:1;transform:scale(1)", TW], [end, "opacity:0;transform:scale(1)"]];
    out.push(`<text x="${W - 20}" y="25" text-anchor="end" ${anim(`sc${i}`, frames, "hud score")}>${pad(s.v)}</text>`);
  });
  out.push(`<rect x="20" y="35" width="${W - 40}" height="3" rx="1.5" fill="#fff" opacity=".12"/>`);
  out.push(`<rect x="20" y="35" width="${W - 40}" height="3" rx="1.5" fill="url(#horizon)" filter="url(#glow)" ${anim("progress", [
    [0, "transform:scaleX(0)"], [RUN_END, "transform:scaleX(1)", TW], [DURATION, "transform:scaleX(1)"],
  ], "fbl")}/>`);

  // ---------- intro / outro ----------
  out.push(`<rect width="${W}" height="${H}" fill="#06021a" ${anim("scrim", [
    [0, "opacity:0"], [RUN_END, "opacity:0"], [RUN_END + 0.7, "opacity:.9", TW],
  ])}/>`);
  defs.push(`<linearGradient id="title" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6ff6ff"/><stop offset=".5" stop-color="#ff8ae0"/><stop offset="1" stop-color="#ffe96e"/></linearGradient>`);
  out.push(`<g ${anim("outro", [
    [0, "opacity:0;transform:translateY(8px)"], [RUN_END + 0.4, "opacity:0;transform:translateY(8px)"],
    [RUN_END + 1, "opacity:1;transform:translateY(0)", TW], [DURATION - 0.4, "opacity:1;transform:translateY(0)"], [DURATION, "opacity:0;transform:translateY(0)", TW],
  ])}>
    <text x="${W / 2}" y="${H / 2 + 4}" text-anchor="middle" class="big" fill="url(#title)" filter="url(#glow)">${total} COMMITS</text>
    <text x="${W / 2}" y="${H / 2 + 30}" text-anchor="middle" class="hud dim">${monthStarts[0].label} → ${monthStarts.at(-1).label} · every cactus cleared</text>
  </g>`);

  // ---------- assemble ----------
  const style = `
    .m{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .hud{font:bold 13px ${FONT};fill:#f4ecff;letter-spacing:1px}
    .dim{fill:#b9a8ff;opacity:.8}
    .fb{transform-box:fill-box;transform-origin:center}
    .fbl{transform-box:fill-box;transform-origin:left center}
    .score,.pop{transform-box:fill-box;transform-origin:right center}
    .pop{font-family:${FONT};font-weight:bold;text-anchor:middle;transform-origin:center}
    .gl{font:bold 9px ${FONT};fill:#b9a8ff;opacity:.55;letter-spacing:1px}
    .big{font:bold 34px ${FONT};letter-spacing:3px}
    ${css.join("\n")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${login}: a dino jumping over ${total} contributions</title>
  <defs>${defs.join("")}</defs>
  <style>${style}</style>
  <g clip-path="url(#frame)">
  ${out.join("\n")}
  </g>
  </svg>`;

  return [{ file: "dino-run.svg", svg }];
}
