// Top languages (by bytes of code in public repositories) as a neon LED
// equalizer: each bar's level is the language's share, and it bounces like
// music around that level, with falling peak markers and a floor reflection.

import { MONO, esc, f1, rng, seedFor } from "../lib.mjs";

export default function render({ login, profile }) {
  const W = 860, H = 250;
  const random = rng(seedFor(login, 31));
  const langs = profile.languages.slice(0, 8);
  const css = [], defs = [], out = [];

  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>`);
  defs.push(`<filter id="glow" x="-50%" y="-20%" width="200%" height="140%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0a1f"/><stop offset="1" stop-color="#040309"/></linearGradient>`);

  defs.push(`<mask id="reflect"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>`);
  // LED segments: dark gaps every 7px across the bars
  defs.push(`<pattern id="leds" width="10" height="7" patternUnits="userSpaceOnUse"><rect y="5" width="10" height="2" fill="#050410"/></pattern>`);
  out.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);

  out.push(`<text x="24" y="32" class="ttl">top languages</text>`);
  out.push(`<text x="${W - 24}" y="32" class="sub" text-anchor="end">@${esc(login)} · public repos</text>`);

  const FLOOR = 178, MAXH = 120;
  defs.push(`<linearGradient id="fade" gradientUnits="userSpaceOnUse" x1="0" y1="${FLOOR}" x2="0" y2="${FLOOR + 70}"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  if (!langs.length) {
    out.push(`<text x="${W / 2}" y="${FLOOR - 50}" class="sub" text-anchor="middle">no public code yet, time to push something ✨</text>`);
  }
  const n = Math.max(1, langs.length);
  const slot = Math.min(96, (W - 80) / n), BW = Math.min(52, slot * 0.6);
  const x0 = (W - slot * n) / 2 + (slot - BW) / 2;
  const bars = [], reflections = [];
  langs.forEach((l, i) => {
    const x = f1(x0 + i * slot);
    const level = Math.max(0.12, Math.sqrt(l.share));          // sqrt keeps small languages visible
    const h = f1(level * MAXH);
    const color = l.color || "#8b949e";
    // a bouncy loop around the language's level
    const beats = Array.from({ length: 6 }, () => f1(Math.min(1.08, Math.max(0.55, 0.78 + (random() - 0.35) * 0.55))));
    const kf = beats.map((b, k) => `${f1((k / beats.length) * 100)}%{transform:scaleY(${b})}`).join("") + `100%{transform:scaleY(${beats[0]})}`;
    css.push(`@keyframes eq${i}{${kf}}`);
    const dur = f1(1.6 + random() * 1.2), delay = f1(-random() * 2);
    const bar = `<g style="transform-box:fill-box;transform-origin:50% 100%;animation:eq${i} ${dur}s ease-in-out ${delay}s infinite">
      <rect x="${x}" y="${f1(FLOOR - h)}" width="${f1(BW)}" height="${h}" rx="3" fill="${color}"/>
      <rect x="${x}" y="${f1(FLOOR - h)}" width="${f1(BW)}" height="${h}" rx="3" fill="url(#leds)"/>
    </g>`;
    bars.push(`<g filter="url(#glow)">${bar}</g>`);
    // peak marker floats just above the bar's typical top and sinks slowly
    css.push(`@keyframes pk${i}{0%{transform:translateY(0)}15%{transform:translateY(-${f1(h * 0.08 + 4)}px)}100%{transform:translateY(${f1(h * 0.22)}px)}}`);
    bars.push(`<rect x="${x}" y="${f1(FLOOR - h - 8)}" width="${f1(BW)}" height="3" rx="1.5" fill="#fff" opacity=".85" style="animation:pk${i} ${dur}s ease-out ${delay}s infinite"/>`);
    reflections.push(`<g transform="translate(0,${2 * FLOOR + 4}) scale(1,-1)">${bar}</g>`);
    bars.push(`<text x="${f1(x + BW / 2)}" y="${FLOOR + 22}" class="lang" text-anchor="middle">${esc(l.name)}</text>`);
    bars.push(`<text x="${f1(x + BW / 2)}" y="${FLOOR + 38}" class="pct" text-anchor="middle" fill="${color}">${(l.share * 100).toFixed(l.share < 0.1 ? 1 : 0)}%</text>`);
  });
  out.push(`<g mask="url(#reflect)" opacity=".6">${reflections.join("")}</g>`);
  out.push(`<rect x="24" y="${FLOOR + 2}" width="${W - 48}" height="1" fill="#fff" opacity=".12"/>`);
  out.push(bars.join("\n"));

  const style = `
    .ttl{font:bold 15px ${MONO};fill:#f0eaff;letter-spacing:2px;text-transform:uppercase}
    .sub{font:12px ${MONO};fill:#9d93c7}
    .lang{font:bold 11px ${MONO};fill:#e8e4ff}
    .pct{font:bold 11px ${MONO}}
    ${css.join("\n")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(login)}: top languages</title>
<defs>${defs.join("")}</defs>
<style>${style}</style>
<g clip-path="url(#frame)">
${out.join("\n")}
</g>
</svg>`;
  return [{ file: "languages.svg", svg }];
}
