// The calm tech stack: two slow rows of soft pills with a colored dot, on a
// transparent background in GitHub colors. Light and dark files.

import { GH_THEMES, SANS, esc, f1 } from "../../lib.mjs";
import { KNOWN, PALETTE } from "../neon/skills.mjs";

export default function render(ctx, options = {}) {
  return [
    { file: "skills.svg", svg: draw(GH_THEMES.light, ctx, options) },
    { file: "skills-dark.svg", svg: draw(GH_THEMES.dark, ctx, options) },
  ];
}

// Relative luminance, to keep near-white or near-black brand colors visible on either theme.
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function draw(T, { login, profile }, options) {
  const W = 860, H = 112, CH = 32, CW = 7.4, PAD = 16, GAP = 10;
  const langColor = new Map(profile.languages.map((l) => [l.name.toLowerCase(), l.color]));
  let skills = options.skills?.length ? options.skills : profile.languages.slice(0, 10).map((l) => l.name);
  if (!skills.length) skills = ["GitHub"];
  const chips = skills.map((s, i) => {
    let color = KNOWN[s.toLowerCase()] || langColor.get(s.toLowerCase()) || PALETTE[i % PALETTE.length];
    const lum = /^#[0-9a-f]{6}$/i.test(color) ? luminance(color) : 0.5;
    if ((T.name === "light" && lum > 0.8) || (T.name === "dark" && lum < 0.04)) color = T.muted;
    return { label: s.slice(0, 28), color };
  });

  const css = [], defs = [], out = [];
  defs.push(`<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".08" stop-color="#fff"/><stop offset=".92" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  defs.push(`<mask id="fadeEdges"><rect width="${W}" height="${H}" fill="url(#edge)"/></mask>`);

  function row(list, y, dir, speed) {
    let x = 0;
    const seq = [];
    while (x < W + 200) for (const c of list) {
      const w = f1(c.label.length * CW + PAD * 2 + 10);
      seq.push({ ...c, x, w });
      x += w + GAP;
    }
    const period = f1(x);
    const draw = (off) => seq.map((c) => `<g transform="translate(${f1(c.x + off)},${y})">
      <rect width="${c.w}" height="${CH}" rx="${CH / 2}" fill="${T.subtle}" stroke="${T.border}"/>
      <circle cx="${PAD + 1}" cy="${CH / 2}" r="4.5" fill="${c.color}"/>
      <text x="${PAD + 12}" y="${CH / 2 + 4.5}" class="chip">${esc(c.label)}</text></g>`).join("");
    const name = `row${y}`;
    css.push(`@keyframes ${name}{from{transform:translateX(${dir < 0 ? 0 : -period}px)}to{transform:translateX(${dir < 0 ? -period : 0}px)}}`);
    return `<g style="animation:${name} ${f1(period / speed)}s linear infinite">${draw(0)}${draw(period)}</g>`;
  }
  const half = Math.ceil(chips.length / 2);
  const rowA = chips.length > 3 ? chips.slice(0, half) : chips;
  const rowB = chips.length > 3 ? chips.slice(half) : [...chips].reverse();
  out.push(`<g mask="url(#fadeEdges)">${row(rowA, 12, -1, 26)}${row(rowB, 62, 1, 20)}</g>`);

  const style = `
    .chip{font:600 13px ${SANS};fill:${T.fg}}
    ${css.join("\n")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-bg="${T.name}">
<title>${esc(login)}: tech stack</title>
<defs>${defs.join("")}</defs>
<style>${style}</style>
${out.join("\n")}
</svg>`;
}
