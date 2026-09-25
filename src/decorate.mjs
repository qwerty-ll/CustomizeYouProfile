// Seasonal overlays drawn on top of any effect: New Year snow and a garland,
// Halloween bats, a spider and jack-o'-lanterns, birthday confetti, balloons
// and a corner ribbon. Only used when the matching mode is active.

import { esc, f1, rng } from "./lib.mjs";

export function decorate(svg, modes, seed) {
  if (!modes?.any) return svg;
  const size = svg.match(/<svg\b[^>]*?\bwidth="([\d.]+)"[^>]*?\bheight="([\d.]+)"/);
  if (!size) return svg;
  const W = +size[1], H = +size[2];
  const random = rng(seed);
  const css = [], parts = [];
  const defs = [`<clipPath id="cyp-clip"><rect width="${W}" height="${H}" rx="14"/></clipPath>`,
    `<filter id="cyp-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`];
  const count = (per, max) => Math.min(max, Math.round((W * H) / per));

  if (modes.newYear) {
    // snow
    css.push(`@keyframes cyp-snow{from{transform:translate(0,-12px)}to{transform:translate(var(--dx),${H + 12}px)}}`);
    for (let i = 0; i < count(5000, 55); i++) {
      const d = 5 + random() * 6;
      parts.push(`<circle cx="${f1(random() * W)}" cy="0" r="${f1(0.8 + random() * 1.6)}" fill="#fff" opacity="${f1(0.55 + random() * 0.45)}" style="--dx:${f1(-20 - random() * 40)}px;animation:cyp-snow ${f1(d)}s linear ${f1(-random() * d)}s infinite"/>`);
    }
    // garland of blinking bulbs along the top edge
    css.push(`@keyframes cyp-blink{0%,100%{opacity:1}50%{opacity:.2}}`);
    const swags = Math.max(2, Math.round(W / 170)), sw = W / swags, dip = Math.min(22, H * 0.1);
    const COLORS = ["#ff4d4d", "#ffd43b", "#51cf66", "#4dabf7", "#f783ac"];
    let wire = "", bulbs = "", k = 0;
    for (let s = 0; s < swags; s++) {
      const x0 = s * sw, x1 = x0 + sw, cx = x0 + sw / 2, cy = 2 + dip * 2;
      wire += `M${f1(x0)} 2Q${f1(cx)} ${f1(cy)} ${f1(x1)} 2`;
      for (let j = 1; j <= 5; j++, k++) {
        const t = j / 6, x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) ** 2 * 2 + 2 * (1 - t) * t * cy + t * t * 2;
        const c = COLORS[k % COLORS.length];
        bulbs += `<g transform="translate(${f1(x)},${f1(y)})"><rect x="-1.6" y="-1" width="3.2" height="3" fill="#2b2b2b"/><ellipse cy="5.5" rx="3" ry="4.4" fill="${c}" filter="url(#cyp-glow)" style="animation:cyp-blink 1.3s ease-in-out ${k % 2 ? "-0.65s" : "0s"} infinite"/></g>`;
      }
    }
    parts.push(`<path d="${wire}" fill="none" stroke="#1f3d25" stroke-width="1.6"/>${bulbs}`);
  }

  if (modes.halloween) {
    // bats flapping across
    css.push(`@keyframes cyp-fly{0%{transform:translate(-40px,var(--y))}50%{transform:translate(${f1(W / 2)}px,calc(var(--y) - 16px))}100%{transform:translate(${W + 40}px,var(--y))}}`);
    css.push(`@keyframes cyp-flap{from{transform:scaleY(1)}to{transform:scaleY(.35)}}`);
    const bat = `<path d="M0 0c-3-4-8-5-12-3 3 1 4 3 4 5-2-1-5-1-7 1 4 0 7 2 9 4 2-1 4-2 6-2s4 1 6 2c2-2 5-4 9-4-2-2-5-2-7-1 0-2 1-4 4-5-4-2-9-1-12 3z" fill="#1a0f1f"/><circle cx="-1.6" cy="1" r=".6" fill="#ff922b"/><circle cx="1.6" cy="1" r=".6" fill="#ff922b"/>`;
    for (let i = 0; i < Math.max(3, Math.round(W / 170)); i++) {
      const d = 7 + random() * 6;
      parts.push(`<g style="--y:${f1(14 + random() * Math.max(10, H * 0.45))}px;animation:cyp-fly ${f1(d)}s linear ${f1(-random() * d)}s infinite"><g transform="scale(${f1(0.7 + random() * 0.6)})"><g style="transform-box:fill-box;transform-origin:center;animation:cyp-flap .18s ease-in-out ${f1(-random())}s infinite alternate">${bat}</g></g></g>`);
    }
    // a spider bobbing on its thread
    const sx = f1(W * 0.86), drop = Math.min(46, H * 0.22);
    css.push(`@keyframes cyp-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(${f1(drop * 0.45)}px)}}`);
    let legs = "";
    for (const s of [-1, 1]) for (let j = 0; j < 4; j++) legs += `<path d="M0 ${f1(-1 + j * 1.3)}q${s * 4} ${f1(-3 + j * 1.2)} ${s * 7} ${f1(j * 1.6 - 1)}" fill="none" stroke="#1a0f1f" stroke-width="1"/>`;
    parts.push(`<g style="animation:cyp-bob 3.2s ease-in-out infinite"><line x1="${sx}" y1="0" x2="${sx}" y2="${f1(drop)}" stroke="#d0d0d0" stroke-width=".6" opacity=".7"/><g transform="translate(${sx},${f1(drop + 4)})">${legs}<ellipse rx="3.4" ry="4.2" fill="#1a0f1f"/><circle cy="-4.4" r="2.2" fill="#1a0f1f"/><circle cx="-.8" cy="-4.6" r=".5" fill="#ff4d4d"/><circle cx=".8" cy="-4.6" r=".5" fill="#ff4d4d"/></g></g>`);
    // jack-o'-lanterns in the bottom corners
    css.push(`@keyframes cyp-flicker{0%,100%{opacity:1}40%{opacity:.6}45%{opacity:.95}70%{opacity:.75}}`);
    const r = f1(Math.min(15, H * 0.07));
    const lantern = (x) => `<g transform="translate(${f1(x)},${f1(H - r - 6)})">
      <rect x="-1.5" y="${f1(-r - 5)}" width="3" height="6" rx="1" fill="#2f6b2f"/>
      <ellipse rx="${r}" ry="${f1(r * 0.82)}" fill="#f76707"/><ellipse rx="${f1(r * 0.45)}" ry="${f1(r * 0.82)}" fill="none" stroke="#c44d00" stroke-width="1"/>
      <g fill="#ffe066" filter="url(#cyp-glow)" style="animation:cyp-flicker 1.7s steps(4) ${f1(-random() * 2)}s infinite">
        <path d="M${f1(-r * 0.55)} ${f1(-r * 0.1)}l${f1(r * 0.22)} ${f1(-r * 0.32)} ${f1(r * 0.22)} ${f1(r * 0.32)}z"/><path d="M${f1(r * 0.11)} ${f1(-r * 0.1)}l${f1(r * 0.22)} ${f1(-r * 0.32)} ${f1(r * 0.22)} ${f1(r * 0.32)}z"/>
        <path d="M${f1(-r * 0.55)} ${f1(r * 0.2)}l${f1(r * 0.18)} ${f1(r * 0.2)} ${f1(r * 0.18)} ${f1(-r * 0.12)} ${f1(r * 0.18)} ${f1(r * 0.12)} ${f1(r * 0.18)} ${f1(-r * 0.12)} ${f1(r * 0.18)} ${f1(r * 0.12)} ${f1(r * 0.18)} ${f1(-r * 0.2)}z"/>
      </g></g>`;
    parts.push(lantern(r + 12), lantern(W - r - 12));
  }

  if (modes.birthday) {
    // confetti
    css.push(`@keyframes cyp-conf{from{transform:translate(0,-10px) rotate(0)}to{transform:translate(var(--dx),${H + 12}px) rotate(var(--r))}}`);
    const COLORS = ["#ff6b6b", "#ffd43b", "#51cf66", "#4dabf7", "#cc5de8", "#ff922b", "#f783ac"];
    for (let i = 0; i < count(3500, 70); i++) {
      const d = 3.5 + random() * 4;
      parts.push(`<rect x="${f1(random() * W)}" y="0" width="${f1(2.5 + random() * 2)}" height="${f1(5 + random() * 3)}" rx=".8" fill="${COLORS[i % COLORS.length]}" style="--dx:${f1((random() - 0.5) * 60)}px;--r:${Math.round((random() < 0.5 ? -1 : 1) * (360 + random() * 540))}deg;transform-box:fill-box;transform-origin:center;animation:cyp-conf ${f1(d)}s linear ${f1(-random() * d)}s infinite"/>`);
    }
    // balloons drifting up
    css.push(`@keyframes cyp-rise{from{transform:translate(0,${H + 50}px)}to{transform:translate(var(--dx),-70px)}}`);
    ["#ff6b6b", "#4dabf7", "#ffd43b", "#cc5de8"].forEach((c, i) => {
      const d = 9 + random() * 5, x = f1(W * (0.12 + i * 0.24) + (random() - 0.5) * 40);
      parts.push(`<g style="--dx:${f1((random() - 0.5) * 50)}px;animation:cyp-rise ${f1(d)}s linear ${f1(-random() * d)}s infinite"><g transform="translate(${x},0)"><path d="M0 16q-3 8 2 14t-1 16" fill="none" stroke="#ced4da" stroke-width=".8"/><ellipse rx="10" ry="13" fill="${c}" opacity=".9"/><ellipse cx="-3.5" cy="-5" rx="2.4" ry="4" fill="#fff" opacity=".45"/><path d="M-2 13h4l-2 3z" fill="${c}"/></g></g>`);
    });
    // corner ribbon
    defs.push(`<linearGradient id="cyp-rib" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f06595"/><stop offset=".5" stop-color="#cc5de8"/><stop offset="1" stop-color="#f06595"/></linearGradient>`);
    const label = `🎂 ${modes.text.happyBirthday}`;
    parts.push(`<g transform="translate(${W},0) rotate(45)"><rect x="-110" y="52" width="220" height="22" fill="url(#cyp-rib)"/><rect x="-110" y="53.5" width="220" height="19" fill="none" stroke="#fff" stroke-opacity=".5" stroke-dasharray="3 3"/>
      <text x="0" y="67.5" text-anchor="middle" textLength="${Math.min(118, label.length * 7.2)}" lengthAdjust="spacingAndGlyphs" style="font:bold 10px system-ui,-apple-system,'Segoe UI',sans-serif;fill:#fff;letter-spacing:1px">${esc(label)}</text></g>`);
  }

  const overlay = `<defs>${defs.join("")}</defs><style>${css.join("\n")}</style><g clip-path="url(#cyp-clip)" pointer-events="none">${parts.join("\n")}</g>`;
  const end = svg.lastIndexOf("</svg>");
  return `${svg.slice(0, end)}${overlay}\n${svg.slice(end)}`;
}
