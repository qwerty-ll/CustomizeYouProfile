// An old CRT oscilloscope sweeps a green phosphor trace of daily commits
// across the year: scanlines, glow, vignette, a beam dot and peak markers.

import { MONO, TW, f1, keyframeBuilder, monthName, seedFor } from "../lib.mjs";

export default function render({ login, days, weeks, total, maxCount }, options = {}) {
  const W = 860, H = 300;
  const S = { x: 22, y: 22, w: 650, h: 256 };           // screen
  const P = { x: S.x + 18, y: S.y + 30, w: S.w - 36, h: S.h - 62 };   // plot area inside the screen
  const PHOS = "#46ff9a";

  // ---------- signal ----------
  const counts = days.map((d) => d.count);
  const smooth = counts.map((_, i) => {
    let s = 0, wsum = 0;
    for (let k = -3; k <= 3; k++) {
      const v = counts[i + k];
      if (v === undefined) continue;
      const w = Math.exp(-(k * k) / (2 * 1.1 * 1.1));
      s += v * w; wsum += w;
    }
    return s / wsum;
  });
  const peak = Math.max(1, ...smooth.map(Math.sqrt));
  const BASE = P.y + P.h * 0.78;
  const pts = [];
  const N = days.length;
  for (let i = 0; i < N; i++) {
    for (const half of [0, 0.5]) {
      const idx = Math.min(N - 1, i + half);
      const v = half ? (smooth[i] + (smooth[i + 1] ?? smooth[i])) / 2 : smooth[i];
      const noise = Math.sin(idx * 2.7) * 1.1 + Math.sin(idx * 7.3 + 1) * 0.7;
      // ringing after a spike makes it read like a real signal
      const ring = Math.sqrt(v) > 0.3 ? Math.sin(idx * 3.1) * Math.min(6, Math.sqrt(v) * 1.2) : 0;
      const y = BASE - (Math.sqrt(v) / peak) * (P.h * 0.62) + noise + ring;
      pts.push([P.x + (idx / (N - 1)) * P.w, Math.max(P.y + 2, y)]);
    }
  }
  const d = "M" + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join("L");
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum.at(-1);

  // ---------- timeline ----------
  const START = 0.4, SWEEP = 9, HOLD = 2.6, FADE = 1.2;
  const END = START + SWEEP;
  const DURATION = END + HOLD + FADE;
  const keyframes = keyframeBuilder(DURATION);
  const css = [];
  const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);
  const timeAtPoint = (pi) => START + (cum[pi] / L) * SWEEP;

  // ---------- scene ----------
  const defs = [], out = [];
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>`);
  defs.push(`<clipPath id="screen"><rect x="${S.x}" y="${S.y}" width="${S.w}" height="${S.h}" rx="18"/></clipPath>`);
  defs.push(`<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f47"/><stop offset=".08" stop-color="#2a2e35"/><stop offset="1" stop-color="#15171b"/></linearGradient>`);
  defs.push(`<radialGradient id="crt" cx=".5" cy=".5" r=".7"><stop offset="0" stop-color="#08200f"/><stop offset=".7" stop-color="#041208"/><stop offset="1" stop-color="#010502"/></radialGradient>`);
  defs.push(`<radialGradient id="vignette" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>`);
  defs.push(`<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  defs.push(`<pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity=".35"/></pattern>`);
  defs.push(`<filter id="phos" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<filter id="beam" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<radialGradient id="knob" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#9aa1ab"/><stop offset=".5" stop-color="#4b5058"/><stop offset="1" stop-color="#1c1f24"/></radialGradient>`);

  out.push(`<rect width="${W}" height="${H}" fill="url(#body)"/>`);
  out.push(`<rect x="${S.x - 8}" y="${S.y - 8}" width="${S.w + 16}" height="${S.h + 16}" rx="24" fill="#0b0c0e" stroke="#4a4f57" stroke-width="1.5"/>`);

  // screen contents
  const scr = [];
  scr.push(`<rect x="${S.x}" y="${S.y}" width="${S.w}" height="${S.h}" fill="url(#crt)"/>`);
  // graticule: 10 × 8 divisions with minor ticks on the axes
  let grat = "";
  for (let i = 0; i <= 10; i++) grat += `<line x1="${f1(P.x + (i * P.w) / 10)}" y1="${P.y}" x2="${f1(P.x + (i * P.w) / 10)}" y2="${P.y + P.h}"/>`;
  for (let j = 0; j <= 8; j++) grat += `<line x1="${P.x}" y1="${f1(P.y + (j * P.h) / 8)}" x2="${P.x + P.w}" y2="${f1(P.y + (j * P.h) / 8)}"/>`;
  let ticks = "";
  for (let i = 0; i <= 50; i++) ticks += `<line x1="${f1(P.x + (i * P.w) / 50)}" y1="${f1(BASE - 2)}" x2="${f1(P.x + (i * P.w) / 50)}" y2="${f1(BASE + 2)}"/>`;
  for (let j = 0; j <= 40; j++) ticks += `<line x1="${f1(P.x + P.w / 2 - 2)}" y1="${f1(P.y + (j * P.h) / 40)}" x2="${f1(P.x + P.w / 2 + 2)}" y2="${f1(P.y + (j * P.h) / 40)}"/>`;
  scr.push(`<g stroke="${PHOS}" stroke-opacity=".13" stroke-width="1">${grat}</g><g stroke="${PHOS}" stroke-opacity=".3" stroke-width="1">${ticks}</g>`);
  scr.push(`<line x1="${P.x}" y1="${f1(BASE)}" x2="${P.x + P.w}" y2="${f1(BASE)}" stroke="${PHOS}" stroke-opacity=".25" stroke-dasharray="2 3"/>`);

  // month labels along the bottom
  let lastX = -99;
  days.forEach((dd, i) => {
    if (!dd.date.endsWith("-01")) return;
    const x = P.x + (i / (N - 1)) * P.w;
    if (x - lastX < 30) return;
    scr.push(`<text x="${f1(x)}" y="${P.y + P.h + 16}" class="scr" text-anchor="middle">${monthName(dd.date).toUpperCase()}</text>`);
    lastX = x;
  });

  // phosphor memory of the previous sweep, then the live trace drawn by the beam
  scr.push(`<path d="${d}" fill="none" stroke="${PHOS}" stroke-width="1.2" opacity=".08"/>`);
  const draw = [[0, "stroke-dashoffset:1;opacity:1"], [START, "stroke-dashoffset:1;opacity:1"], [END, "stroke-dashoffset:0;opacity:1", TW],
    [END + HOLD, "stroke-dashoffset:0;opacity:1"], [DURATION, "stroke-dashoffset:0;opacity:0", TW]];
  scr.push(`<g filter="url(#phos)"><path d="${d}" pathLength="1" stroke-dasharray="1 1" fill="none" stroke="${PHOS}" stroke-width="1.8" stroke-linejoin="round" ${anim("trace", draw)}/></g>`);

  // beam dot follows the trace by arc length
  const beamFrames = [[0, `transform:translate(${f1(pts[0][0])}px,${f1(pts[0][1])}px);opacity:0`], [START, `transform:translate(${f1(pts[0][0])}px,${f1(pts[0][1])}px);opacity:1`]];
  const SAMPLES = 160;
  let pi = 0;
  for (let k = 1; k <= SAMPLES; k++) {
    const target = (k / SAMPLES) * L;
    while (pi < pts.length - 1 && cum[pi] < target) pi++;
    beamFrames.push([START + (k / SAMPLES) * SWEEP, `transform:translate(${f1(pts[pi][0])}px,${f1(pts[pi][1])}px);opacity:1`, TW]);
  }
  beamFrames.push([END + 0.15, `transform:translate(${f1(pts.at(-1)[0])}px,${f1(pts.at(-1)[1])}px);opacity:0`, TW]);
  scr.push(`<circle r="2.6" fill="#eafff2" filter="url(#beam)" ${anim("beam", beamFrames)}/>`);

  // peak markers pop up as the beam passes the biggest days
  const ranked = [...days].filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
  const top = [];
  for (const dd of ranked) {
    if (top.length === 3) break;
    if (top.every((t) => Math.abs(t.index - dd.index) * (P.w / N) > 110)) top.push(dd);
  }
  top.forEach((dd, k) => {
    const i = dd.index * 2;
    const [x, y] = pts[i];
    const at = timeAtPoint(i);
    scr.push(`<g ${anim(`pk${k}`, [[0, "opacity:0"], [at, "opacity:1"], [END + HOLD, "opacity:1"], [DURATION, "opacity:0", TW]])}>
      <path d="M${f1(x)} ${f1(y - 6)}l-4 -7h8z" fill="${PHOS}"/>
      <text x="${f1(x)}" y="${f1(y - 17)}" class="scr pk" text-anchor="middle">${dd.count} · ${monthName(dd.date).toUpperCase()} ${Number(dd.date.slice(8))}</text>
    </g>`);
  });

  // on-screen readouts
  scr.push(`<text x="${P.x}" y="${S.y + 20}" class="scr">CH1 √COMMITS  1D/PT  ${login.toUpperCase()}</text>`);
  scr.push(`<text x="${P.x + P.w}" y="${S.y + 20}" class="scr" text-anchor="end">Σ ${total}  MAX ${top[0]?.count ?? 0}</text>`);
  scr.push(`<g ${anim("trig", [[0, "opacity:0"], [START, "opacity:1"], [END, "opacity:0"]])}><text x="${P.x + P.w / 2}" y="${S.y + 20}" class="scr" text-anchor="middle" style="animation:blink .8s steps(1) infinite">● TRIG'D</text></g>`);
  scr.push(`<g ${anim("stop", [[0, "opacity:0"], [END, "opacity:1"], [DURATION - 0.2, "opacity:0"]])}><text x="${P.x + P.w / 2}" y="${S.y + 20}" class="scr" text-anchor="middle">■ STOP</text></g>`);
  css.push(`@keyframes blink{50%{opacity:.2}}`);

  // CRT effects on top: scanlines, vignette, glass, flicker
  scr.push(`<rect x="${S.x}" y="${S.y}" width="${S.w}" height="${S.h}" fill="url(#scan)"/>`);
  scr.push(`<rect x="${S.x}" y="${S.y}" width="${S.w}" height="${S.h}" fill="url(#vignette)"/>`);
  scr.push(`<rect x="${S.x}" y="${S.y}" width="${S.w}" height="${S.h}" fill="url(#glass)"/>`);
  scr.push(`<rect x="${S.x}" y="${S.y}" width="${S.w}" height="12" fill="${PHOS}" opacity=".04" style="animation:roll 6s linear infinite"/>`);
  css.push(`@keyframes roll{from{transform:translateY(0)}to{transform:translateY(${S.h}px)}}@keyframes flicker{0%,100%{opacity:1}50%{opacity:.94}}`);
  out.push(`<g clip-path="url(#screen)" style="animation:flicker .12s linear infinite">${scr.join("\n")}</g>`);

  // control panel
  const PX = S.x + S.w + 30, PW = W - PX - 18;
  out.push(`<text x="${PX + PW / 2}" y="40" class="brand" text-anchor="middle">GIT·SCOPE</text>`);
  out.push(`<text x="${PX + PW / 2}" y="54" class="cap" text-anchor="middle">MODEL ${days.at(-1).date.slice(0, 4)}</text>`);
  const knob = (cx, cy, r, label, wobble) => `
    <text x="${cx}" y="${cy - r - 8}" class="cap" text-anchor="middle">${label}</text>
    ${Array.from({ length: 9 }, (_, k) => { const a = (-135 + k * 33.75) * Math.PI / 180; return `<line x1="${f1(cx + Math.sin(a) * (r + 3))}" y1="${f1(cy - Math.cos(a) * (r + 3))}" x2="${f1(cx + Math.sin(a) * (r + 6))}" y2="${f1(cy - Math.cos(a) * (r + 6))}" stroke="#7d848e" stroke-width="1"/>`; }).join("")}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#knob)" stroke="#0b0c0e"/>
    <g style="transform-origin:${cx}px ${cy}px;${wobble ? `animation:${wobble}` : "transform:rotate(-30deg)"}"><line x1="${cx}" y1="${cy - 3}" x2="${cx}" y2="${cy - r + 3}" stroke="#f1f3f5" stroke-width="2" stroke-linecap="round"/></g>`;
  css.push(`@keyframes turn{0%,100%{transform:rotate(-40deg)}50%{transform:rotate(55deg)}}@keyframes turn2{0%,100%{transform:rotate(20deg)}50%{transform:rotate(-25deg)}}`);
  out.push(knob(PX + PW / 2 - 30, 100, 16, "VOLTS/DIV", ""));
  out.push(knob(PX + PW / 2 + 30, 100, 16, "TIME/DIV", "turn 9s ease-in-out infinite"));
  out.push(knob(PX + PW / 2 - 30, 168, 12, "POSITION", "turn2 7s ease-in-out infinite"));
  out.push(knob(PX + PW / 2 + 30, 168, 12, "TRIGGER", ""));
  // buttons + power
  ["CH1", "CH2", "RUN"].forEach((b, k) => {
    const bx = PX + 8 + k * ((PW - 16) / 3), lit = b === "CH1" || b === "RUN";
    out.push(`<rect x="${f1(bx)}" y="206" width="${f1((PW - 16) / 3 - 6)}" height="16" rx="3" fill="#23262c" stroke="#4a4f57"/><text x="${f1(bx + ((PW - 16) / 3 - 6) / 2)}" y="218" class="cap" text-anchor="middle" style="fill:${lit ? PHOS : "#7d848e"}">${b}</text>`);
  });
  out.push(`<circle cx="${PX + 14}" cy="${H - 34}" r="5" fill="${PHOS}" filter="url(#beam)" style="animation:blink 2.4s ease-in-out infinite"/><text x="${PX + 26}" y="${H - 30}" class="cap">POWER</text>`);
  out.push(`<text x="${PX + PW}" y="${H - 30}" class="cap" text-anchor="end">@${login}</text>`);

  const style = `
    .m{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .scr{font:11px ${MONO};fill:${PHOS};opacity:.8;letter-spacing:.5px}
    .pk{font-weight:bold;opacity:1}
    .brand{font:bold 15px ${MONO};fill:#e9ecef;letter-spacing:3px}
    .cap{font:9px ${MONO};fill:#adb5bd;letter-spacing:1px}
    ${css.join("\n")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${login}: commit oscilloscope</title>
  <defs>${defs.join("")}</defs>
  <style>${style}</style>
  <g clip-path="url(#frame)">
  ${out.join("\n")}
  </g>
  </svg>`;
  return [{ file: "oscilloscope.svg", svg }];
}
