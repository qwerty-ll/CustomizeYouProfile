// Obstacles for every dino style: cacti, and the opt-in seasonal Christmas
// trees and pumpkin towers. All keep the cactus footprint (x..x+cw, height h)
// so the jump planning in dino-plan.mjs stays valid.

const f = (n) => +n.toFixed(1);
const ORNAMENTS = ["#ff4d4d", "#ffd43b", "#4dabf7", "#f783ac"];

// cactusFill(level) -> fill value; glow/highlight are neon-only touches.
export function obstacleKit(GROUND, { cactusFill, glow = false, highlight = false }) {
  const filter = glow ? ` filter="url(#glow)"` : "";
  const defs = [
    `<linearGradient id="tree" gradientUnits="userSpaceOnUse" x1="0" y1="${GROUND - 60}" x2="0" y2="${GROUND}"><stop offset="0" stop-color="#69db7c"/><stop offset="1" stop-color="#1b7a3a"/></linearGradient>`,
    `<radialGradient id="pk" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffa94d"/><stop offset="1" stop-color="#d9480f"/></radialGradient>`,
  ];
  const css = [`@keyframes fl{0%,100%{opacity:1}40%{opacity:.55}45%{opacity:.95}70%{opacity:.7}}`];

  function cactus({ x, h, level, count, date }) {
    const tw = 6 + level, arm = 4, tx = x + 7;
    const parts = [`<rect x="${tx}" y="${GROUND - h}" width="${tw}" height="${h + 1}" rx="${tw / 2}"/>`];
    const ly = f(GROUND - h * 0.48), la = f(h * 0.26);
    parts.push(`<rect x="${x}" y="${f(ly - la)}" width="${arm}" height="${f(la + arm)}" rx="2"/>`, `<rect x="${x}" y="${ly}" width="${tx - x + 1}" height="${arm}" rx="2"/>`);
    if (h > 24) {
      const ry = f(GROUND - h * 0.66), ra = f(h * 0.2), rx = tx + tw + 3;
      parts.push(`<rect x="${rx}" y="${f(ry - ra)}" width="${arm}" height="${f(ra + arm)}" rx="2"/>`, `<rect x="${tx + tw - 1}" y="${ry}" width="${rx + arm - tx - tw + 1}" height="${arm}" rx="2"/>`);
    }
    if (highlight) parts.push(`<rect x="${tx + 1.5}" y="${GROUND - h + 3}" width="1.5" height="${h - 6}" rx=".75" fill="#fff" opacity=".45"/>`);
    return `<g fill="${cactusFill(level)}"${filter}><title>${count} contributions on ${date}</title>${parts.join("")}</g>`;
  }

  function tree({ x, h: full, cw, count, date }) {
    const h = full - 6;                                   // leave room for the star on top
    const cx = x + cw / 2, trunk = 4, F = h - trunk, tiers = h > 30 ? 3 : 2, th = F * 0.5;
    const parts = [`<rect x="${f(cx - 2)}" y="${GROUND - trunk}" width="4" height="${trunk + 1}" fill="#8d5a3b"/>`];
    for (let k = 0; k < tiers; k++) {
      const yb = GROUND - trunk - (k * (F - th)) / (tiers - 1), half = (cw / 2) * (1 - 0.2 * k) + 1;
      parts.push(`<path d="M${f(cx - half)} ${f(yb)}L${f(cx + half)} ${f(yb)}L${f(cx)} ${f(yb - th)}Z" fill="url(#tree)"/>`);
      parts.push(`<circle cx="${f(cx - half * 0.45)}" cy="${f(yb - 3)}" r="1.4" fill="${ORNAMENTS[k % 4]}"/><circle cx="${f(cx + half * 0.4)}" cy="${f(yb - th * 0.4)}" r="1.4" fill="${ORNAMENTS[(k + 2) % 4]}"/>`);
    }
    parts.push(`<path d="M${f(cx)} ${f(GROUND - h - 5)}l1.5 3.4 3.6.4-2.7 2.4.8 3.6-3.2-1.9-3.2 1.9.8-3.6-2.7-2.4 3.6-.4z" fill="#fcc419"/>`);
    return `<g${filter}><title>${count} contributions on ${date}</title>${parts.join("")}</g>`;
  }

  function pumpkins({ x, h: full, cw, count, date }) {
    const h = full - 4;                                   // leave room for the stem on top
    const n = Math.max(1, Math.round(h / 16)), ph = h / n, cx = x + cw / 2;
    const parts = [];
    for (let j = 0; j < n; j++) {
      const cy = GROUND - ph * (j + 0.5), rx = (cw / 2) * (1 - 0.06 * j) - 0.5, ry = ph / 2 + 0.6;
      parts.push(`<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#pk)"/><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx * 0.42)}" ry="${f(ry)}" fill="none" stroke="#b33f00" stroke-width=".9"/>`);
    }
    const ty = GROUND - ph * (n - 0.5), fr = Math.min(cw / 2, ph / 2);
    parts.push(`<rect x="${f(cx - 1.5)}" y="${f(GROUND - h - 4)}" width="3" height="5" rx="1" fill="#2f6b2f"/>`);
    parts.push(`<g fill="#ffe066" style="animation:fl 1.6s steps(4) infinite"><path d="M${f(cx - fr * 0.6)} ${f(ty - fr * 0.05)}l${f(fr * 0.25)} ${f(-fr * 0.35)} ${f(fr * 0.25)} ${f(fr * 0.35)}z"/><path d="M${f(cx + fr * 0.1)} ${f(ty - fr * 0.05)}l${f(fr * 0.25)} ${f(-fr * 0.35)} ${f(fr * 0.25)} ${f(fr * 0.35)}z"/><path d="M${f(cx - fr * 0.55)} ${f(ty + fr * 0.2)}h${f(fr * 1.1)}l${f(-fr * 0.2)} ${f(fr * 0.25)}h${f(-fr * 0.7)}z"/></g>`);
    return `<g${filter}><title>${count} contributions on ${date}</title>${parts.join("")}</g>`;
  }

  return {
    defs, css,
    obstacle: (c, modes = {}) => (modes.halloween ? pumpkins(c) : modes.newYear ? tree(c) : cactus(c)),
  };
}

// Santa hat drawn in dino-local coordinates (the head sits at x 18..38, y 0).
export const SANTA_HAT = `<rect x="18" y="-2" width="20" height="4" rx="2" fill="#f8f9fa"/><path d="M20 -2L36 -2Q30 -15 15 -12Z" fill="#e03131"/><circle cx="14.5" cy="-12" r="2.6" fill="#f8f9fa"/>`;


// The Chrome-style T-rex, 2px pixels: "#" body, "e" eye; legs have two run frames and a standing pose.
export const BODY = [
  "..........########..",
  ".........##e#######.",
  ".........##########.",
  ".........##########.",
  ".........#####......",
  ".........########...",
  "#.......#####.......",
  "#.....#######.......",
  "##...##########.....",
  "###.#########.#.....",
  "##############......",
  ".############.......",
  "..##########........",
  "...########.........",
];
export const LEGS = {
  a: ["....###.##..........", "....##...##.........", "....#...............", "....##.............."],
  b: ["....###.##..........", ".....#...#..........", ".........#..........", ".........##........."],
  stand: ["....###.##..........", "....##...#..........", "....#....#..........", "....##...##........."],
};
export const pixels = (rows, ch, y0 = 0, PX = 2) =>
  rows.flatMap((line, y) => [...line].map((c, x) => (c === ch ? `M${x * PX} ${(y + y0) * PX}h${PX}v${PX}h-${PX}z` : ""))).join("");
