// A solar system of the contribution year: every month is a planet (size by
// commits), every active day is a moon circling its month. The oldest month
// orbits closest to the sun.

import { MONO, f1, monthsOf, rng, seedFor } from "../lib.mjs";

export default function render({ login, days, weeks, total, maxCount }, options = {}) {
  const W = 860, H = 330, CX = W / 2, CY = H / 2 + 16, TILT = 0.3;
  const random = rng(seedFor(login, 1543));
  const months = monthsOf(days);
  const maxMonth = Math.max(1, ...months.map((m) => m.total));
  const MAX_MOONS = 8;
  const moonsOf = (m) => m.days.filter((d) => d.count > 0).sort((a, b) => b.count - a.count).slice(0, MAX_MOONS);

  // Planet looks go from icy/rocky (quiet months) to hot gas giants (busy months).
  const LOOKS = [
    ["#8fa3bf", "#3b4a63"], ["#9ad1d4", "#2c6e7f"], ["#8ce99a", "#2b8a3e"],
    ["#ffd43b", "#e8590c"], ["#ff8787", "#c2255c"], ["#e599f7", "#7048e8"],
  ];
  const MOON = ["#cfd8e3", "#9be9a8", "#40c463", "#ffd166", "#ff7ad9"];

  const css = [];
  const defs = [];
  const out = [];
  defs.push(`<radialGradient id="sun" cx=".45" cy=".4" r=".65"><stop offset="0" stop-color="#fffbe6"/><stop offset=".35" stop-color="#ffd43b"/><stop offset=".75" stop-color="#ff922b"/><stop offset="1" stop-color="#e8590c"/></radialGradient>`);
  defs.push(`<radialGradient id="corona"><stop offset=".3" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ff6b00" stop-opacity="0"/></radialGradient>`);
  defs.push(`<radialGradient id="neb1"><stop offset="0" stop-color="#7048e8" stop-opacity=".35"/><stop offset="1" stop-color="#7048e8" stop-opacity="0"/></radialGradient>`);
  defs.push(`<radialGradient id="neb2"><stop offset="0" stop-color="#c2255c" stop-opacity=".25"/><stop offset="1" stop-color="#c2255c" stop-opacity="0"/></radialGradient>`);
  defs.push(`<filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>`);
  LOOKS.forEach(([a, b], i) =>
    defs.push(`<radialGradient id="pl${i}" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".18" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`));

  // space
  out.push(`<rect width="${W}" height="${H}" fill="#04040f"/>`);
  out.push(`<ellipse cx="${W * 0.2}" cy="${H * 0.3}" rx="260" ry="140" fill="url(#neb1)"/>`);
  out.push(`<ellipse cx="${W * 0.82}" cy="${H * 0.75}" rx="240" ry="120" fill="url(#neb2)"/>`);
  let stars = "";
  for (let i = 0; i < 120; i++)
    stars += `<circle cx="${f1(random() * W)}" cy="${f1(random() * H)}" r="${random() < 0.1 ? 1.2 : 0.6}" fill="#fff" style="animation:tw ${f1(1.5 + random() * 4)}s ease-in-out ${f1(-random() * 4)}s infinite alternate"/>`;
  css.push(`@keyframes tw{from{opacity:.15}to{opacity:.85}}`);
  out.push(stars);

  // Keyframes that walk an ellipse; the far side is smaller and dimmer.
  function orbit(name, rx, ry, depth = true, steps = 36) {
    const frames = [];
    for (let k = 0; k <= steps; k++) {
      const a = (k / steps) * Math.PI * 2;
      const front = (Math.sin(a) + 1) / 2;                 // 0 = behind the sun, 1 = in front
      const s = depth ? 0.72 + 0.4 * front : 1;
      frames.push(`${f1((k / steps) * 100)}%{transform:translate(${f1(Math.cos(a) * rx)}px,${f1(Math.sin(a) * ry)}px) scale(${s.toFixed(2)})${depth ? `;opacity:${(0.55 + 0.45 * front).toFixed(2)}` : ""}}`);
    }
    css.push(`@keyframes ${name}{${frames.join("")}}`);
  }

  // orbits
  const n = months.length;
  const R0 = 62, R1 = CX - 30;
  const planets = months.map((m, i) => {
    const rx = R0 + (i / Math.max(1, n - 1)) * (R1 - R0);
    const heat = m.total / maxMonth;
    return {
      m, rx, ry: rx * TILT,
      r: f1(4 + Math.sqrt(heat) * 14),
      look: m.total === 0 ? 0 : 1 + Math.min(LOOKS.length - 2, Math.floor(Math.sqrt(heat) * (LOOKS.length - 1))),
      period: f1(10 + i * 4.2),
      phase: random(),
      ring: m.total === maxMonth || (heat > 0.5 && random() < 0.5),
    };
  });
  for (const p of planets)
    out.push(`<ellipse cx="${CX}" cy="${CY}" rx="${f1(p.rx)}" ry="${f1(p.ry)}" fill="none" stroke="${p.m.total ? "#9fb4ff" : "#ffffff"}" stroke-opacity="${p.m.total ? 0.16 : 0.06}" stroke-dasharray="${p.m.total ? "none" : "2 4"}"/>`);

  // Planets behind the sun are drawn before it, planets in front after it; each
  // planet flips layers by fading between its two copies at the half-orbit.
  function planetSvg(p, i) {
    const { m } = p;
    const parts = [];
    if (p.ring) parts.push(`<ellipse rx="${f1(p.r * 1.9)}" ry="${f1(p.r * 0.55)}" fill="none" stroke="#ffe8a3" stroke-opacity=".7" stroke-width="1.6" transform="rotate(-14)"/>`);
    parts.push(`<circle r="${p.r}" fill="url(#pl${p.look})"${m.total ? ` filter="url(#glow)"` : ""}><title>${m.name} ${m.year}: ${m.total} commits</title></circle>`);
    // moons: one per active day (the 8 biggest on busy months), bigger for bigger days
    moonsOf(m).forEach((d, k) => {
      const mr = f1(p.r + 5 + k * 3.2), mry = f1(mr * 0.55);
      const name = `mo${i}_${k}`;
      orbit(name, mr, mry, false, 24);
      const period = f1(2.2 + k * 0.9 + random());
      parts.push(`<circle r="${f1(1.2 + 2.6 * Math.sqrt(d.count / Math.max(1, maxCount)))}" fill="${MOON[Math.min(4, d.level)]}" filter="url(#glow)" style="animation:${name} ${period}s linear ${f1(-random() * period)}s infinite"><title>${d.date}: ${d.count} commits</title></circle>`);
    });
    parts.push(`<text y="${f1(p.r + 13)}" class="pl">${m.name}${m.total ? ` · ${m.total}` : ""}</text>`);
    return parts.join("");
  }
  const back = [], front = [];
  planets.forEach((p, i) => {
    orbit(`o${i}`, p.rx, p.ry);
    const delay = f1(-p.phase * p.period);
    const move = `animation:o${i} ${p.period}s linear ${delay}s infinite`;
    const body = planetSvg(p, i);
    // same body twice: the front half of the orbit is 0-50%, the back half 50-100%
    css.push(`@keyframes bk${i}{0%{visibility:hidden}50%{visibility:visible}}`);
    css.push(`@keyframes fr${i}{0%{visibility:visible}50%{visibility:hidden}}`);
    back.push(`<g transform="translate(${CX},${CY})"><g style="animation:bk${i} ${p.period}s steps(1) ${delay}s infinite"><g style="${move}">${body}</g></g></g>`);
    front.push(`<g transform="translate(${CX},${CY})"><g style="animation:fr${i} ${p.period}s steps(1) ${delay}s infinite"><g style="${move}">${body}</g></g></g>`);
  });
  out.push(back.join("\n"));

  // the sun: the whole year
  let rays = "";
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * 360;
    rays += `<path d="M0 -30L3 -46L0 -58L-3 -46Z" fill="#ffd43b" opacity="${k % 2 ? 0.35 : 0.6}" transform="rotate(${a})"/>`;
  }
  css.push(`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`);
  out.push(`<g transform="translate(${CX},${CY})">
    <circle r="70" fill="url(#corona)" style="animation:pulse 4s ease-in-out infinite"/>
    <g style="animation:spin 40s linear infinite">${rays}</g>
    <circle r="30" fill="url(#sun)" filter="url(#glow)"/>
    <text y="4" class="sun">${total}</text>
  </g>`);
  out.push(front.join("\n"));

  // legend
  const busiest = months.reduce((a, b) => (b.total > a.total ? b : a));
  out.push(`<text x="18" y="26" class="hud">@${login}'s commit system</text>`);
  out.push(`<text x="18" y="44" class="hud dim">${n} planets · ${months.reduce((n, m) => n + moonsOf(m).length, 0)} moons · ${total} commits</text>`);
  out.push(`<text x="${W - 18}" y="26" class="hud" text-anchor="end">largest planet: ${busiest.name} ${busiest.year}</text>`);
  out.push(`<text x="${W - 18}" y="44" class="hud dim" text-anchor="end">inner orbit = ${months[0].name} ${months[0].year}</text>`);

  const style = `
    .hud{font:bold 12px ${MONO};fill:#dfe6ff;letter-spacing:.5px}
    .dim{fill:#9fb4ff;opacity:.7;font-weight:normal}
    .pl{font:10px ${MONO};fill:#dfe6ff;opacity:.75;text-anchor:middle}
    .sun{font:bold 13px ${MONO};fill:#7a2e00;text-anchor:middle}
    ${css.join("\n")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>${login}: a solar system of ${total} contributions</title>
  <defs>${defs.join("")}</defs>
  <style>${style}</style>
  <g clip-path="url(#frame)">
  ${out.join("\n")}
  </g>
  </svg>`;
  return [{ file: "solar-system.svg", svg }];
}
