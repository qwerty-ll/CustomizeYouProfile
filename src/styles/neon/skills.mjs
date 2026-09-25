// Your tech stack as two rows of neon chips gliding in opposite directions.
// options.skills is the list; without it, your top languages are used.

import { MONO, esc, f1 } from "../../lib.mjs";

// A few well-known brand-ish colors; everything else cycles through a palette.
export const KNOWN = {
  javascript: "#f7df1e", typescript: "#3178c6", python: "#3776ab", react: "#61dafb", "node.js": "#5fa04e", node: "#5fa04e",
  vue: "#42b883", svelte: "#ff3e00", angular: "#dd0031", "next.js": "#ffffff", html: "#e34f26", css: "#1572b6",
  tailwind: "#38bdf8", tailwindcss: "#38bdf8", go: "#00add8", rust: "#dea584", java: "#ed8b00", kotlin: "#a97bff",
  swift: "#f05138", "c#": "#9b4f96", "c++": "#f34b7d", c: "#a8b9cc", php: "#777bb4", ruby: "#cc342d", docker: "#2496ed",
  kubernetes: "#326ce5", linux: "#fcc624", git: "#f05032", figma: "#f24e1e", postgresql: "#4169e1", mysql: "#4479a1",
  mongodb: "#47a248", redis: "#dc382d", aws: "#ff9900", firebase: "#ffca28", unity: "#ffffff", godot: "#478cbf",
  flutter: "#02569b", dart: "#0175c2", graphql: "#e10098", django: "#44b78b", fastapi: "#009688", blender: "#f5792a",
};
export const PALETTE = ["#7ee8fa", "#c77dff", "#ff5fa2", "#ffd166", "#9dff8a", "#4dabf7", "#ffa94d"];

export default function render({ login, profile }, options = {}) {
  const W = 860, H = 150, CH = 34, CW = 8.2, PAD = 18, GAP = 12;
  const langColor = new Map(profile.languages.map((l) => [l.name.toLowerCase(), l.color]));
  let skills = options.skills?.length ? options.skills : profile.languages.slice(0, 10).map((l) => l.name);
  if (!skills.length) skills = ["GitHub"];
  const chips = skills.map((s, i) => ({ label: s.slice(0, 28), color: KNOWN[s.toLowerCase()] || langColor.get(s.toLowerCase()) || PALETTE[i % PALETTE.length] }));

  const css = [], out = [], defs = [];
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>`);
  defs.push(`<filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".1" stop-color="#fff"/><stop offset=".9" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  defs.push(`<mask id="fadeEdges"><rect width="${W}" height="${H}" fill="url(#edge)"/></mask>`);
  out.push(`<rect width="${W}" height="${H}" fill="#08071a"/>`);
  out.push(`<rect width="${W}" height="${H}" fill="none" stroke="#2a2550" rx="16"/>`);

  // one row = the chip list repeated until it's wider than the card, then doubled for a seamless loop
  function row(list, y, dir, speed) {
    let x = 0, seq = [];
    while (x < W + 200) for (const c of list) {
      const w = f1(c.label.length * CW + PAD * 2);
      seq.push({ ...c, x, w });
      x += w + GAP;
    }
    const period = f1(x);
    const draw = (off) => seq.map((c) => `
      <g transform="translate(${f1(c.x + off)},${y})">
        <rect width="${c.w}" height="${CH}" rx="${CH / 2}" fill="${c.color}" fill-opacity=".1" stroke="${c.color}" stroke-width="1.5" filter="url(#glow)"/>
        <circle cx="${PAD - 4}" cy="${CH / 2}" r="3" fill="${c.color}"/>
        <text x="${f1(PAD + 4)}" y="${CH / 2 + 5}" textLength="${f1(c.label.length * CW)}" lengthAdjust="spacingAndGlyphs" class="chip">${esc(c.label)}</text>
      </g>`).join("");
    const name = `row${y}`;
    css.push(`@keyframes ${name}{from{transform:translateX(${dir < 0 ? 0 : -period}px)}to{transform:translateX(${dir < 0 ? -period : 0}px)}}`);
    return `<g style="animation:${name} ${f1(period / speed)}s linear infinite">${draw(0)}${draw(period)}</g>`;
  }
  const half = Math.ceil(chips.length / 2);
  const rowA = chips.length > 3 ? chips.slice(0, half) : chips;
  const rowB = chips.length > 3 ? chips.slice(half) : [...chips].reverse();
  out.push(`<g mask="url(#fadeEdges)">${row(rowA, 30, -1, 38)}${row(rowB, 86, 1, 30)}</g>`);

  const style = `
    .chip{font:bold 13px ${MONO};fill:#f0eaff;letter-spacing:.5px}
    ${css.join("\n")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(login)}: tech stack</title>
<defs>${defs.join("")}</defs>
<style>${style}</style>
<g clip-path="url(#frame)">
${out.join("\n")}
</g>
</svg>`;
  return [{ file: "skills.svg", svg }];
}
