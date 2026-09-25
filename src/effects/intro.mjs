// A hero banner: your name in glitching neon over a drifting aurora, with
// lines about you typed and erased one after another.
// options.name overrides the display name; options.tagline is a list of lines.

import { MONO, TW, esc, f1, keyframeBuilder, rng, seedFor } from "../lib.mjs";

export default function render({ login, profile, total }, options = {}) {
  const W = 860, H = 210;
  const random = rng(seedFor(login, 77));
  const name = options.name || profile.name || login;
  const top = profile.languages[0]?.name;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const lines = (options.tagline?.length ? options.tagline : [
    `${plural(total, "contribution")} in the last year`,
    top ? `mostly writing ${top}` : "building things on GitHub",
    `${plural(profile.repos, "public repo")} · ${plural(profile.stars, "star")}`,
  ]).map((l) => l.slice(0, 70));

  // ---------- typing timeline ----------
  const CW = 8.4, TY = 150, TYPE = 0.055, ERASE = 0.025, HOLD = 1.8;
  let t = 0.9;
  const typed = lines.map((text) => {
    const l = { text, start: t };
    l.typed = t + text.length * TYPE;
    l.erase = l.typed + HOLD;
    l.end = l.erase + text.length * ERASE;
    t = l.end + 0.35;
    return l;
  });
  const DURATION = t;
  const keyframes = keyframeBuilder(DURATION);
  const css = [];
  const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);

  const defs = [], out = [];
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>`);
  defs.push(`<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>`);
  defs.push(`<filter id="glow" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  // shimmering gradient on the name (SMIL works inside <img> SVGs too)
  defs.push(`<linearGradient id="name" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox" spreadMethod="reflect">
    <stop offset="0" stop-color="#7ee8fa"/><stop offset=".35" stop-color="#c77dff"/><stop offset=".7" stop-color="#ff5fa2"/><stop offset="1" stop-color="#ffd166"/>
    <animateTransform attributeName="gradientTransform" type="translate" values="0 0;1 0;0 0" dur="8s" repeatCount="indefinite"/></linearGradient>`);
  defs.push(`<pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#fff" stroke-opacity=".045"/></pattern>`);

  // aurora background
  out.push(`<rect width="${W}" height="${H}" fill="#07061a"/>`);
  const blobs = [["#5b2bd6", 0.55], ["#0ea5e9", 0.45], ["#ec4899", 0.4], ["#14b8a6", 0.35]];
  blobs.forEach(([c, o], i) => {
    const cx = f1(120 + i * 200 + random() * 60), cy = f1(60 + random() * 90), dx = f1((random() - 0.5) * 220), dy = f1((random() - 0.5) * 80);
    css.push(`@keyframes blob${i}{0%,100%{transform:translate(0,0)}50%{transform:translate(${dx}px,${dy}px)}}`);
    out.push(`<circle cx="${cx}" cy="${cy}" r="${f1(110 + random() * 40)}" fill="${c}" opacity="${o}" filter="url(#blur)" style="animation:blob${i} ${f1(9 + random() * 6)}s ease-in-out infinite"/>`);
  });
  out.push(`<rect width="${W}" height="${H}" fill="url(#grid)"/>`);
  // drifting particles
  let dust = "";
  for (let i = 0; i < 36; i++) {
    const d = f1(6 + random() * 10);
    dust += `<circle cx="${f1(random() * W)}" cy="${f1(random() * H)}" r="${f1(0.6 + random() * 1.2)}" fill="#fff" opacity="${f1(0.2 + random() * 0.5)}" style="animation:rise ${d}s linear ${f1(-random() * d)}s infinite"/>`;
  }
  css.push(`@keyframes rise{from{transform:translateY(20px);opacity:0}20%{opacity:.8}to{transform:translateY(-60px);opacity:0}}`);
  out.push(dust);

  // the name, with a periodic RGB-split glitch
  const size = Math.min(52, Math.floor(760 / Math.max(6, name.length * 0.62)));
  const NX = W / 2, NY = 96;
  const nameText = (fill, extra = "") => `<text x="${NX}" y="${NY}" class="name" text-anchor="middle" font-size="${size}" fill="${fill}"${extra}>${esc(name)}</text>`;
  css.push(`@keyframes gl1{0%,86%,100%{transform:translate(0,0);opacity:0}87%{transform:translate(-4px,1px);opacity:.8}89%{transform:translate(3px,-1px);opacity:.8}91%{transform:translate(-2px,0);opacity:.6}92%{opacity:0}}`);
  css.push(`@keyframes gl2{0%,86%,100%{transform:translate(0,0);opacity:0}87%{transform:translate(4px,-1px);opacity:.8}89%{transform:translate(-3px,1px);opacity:.8}91%{transform:translate(2px,0);opacity:.6}92%{opacity:0}}`);
  css.push(`@keyframes jolt{0%,86%,92%,100%{transform:translate(0,0)}88%{transform:translate(2px,0)}90%{transform:translate(-2px,0)}}`);
  out.push(`<g style="animation:gl1 4.3s steps(1) infinite">${nameText("#00f0ff")}</g>`);
  out.push(`<g style="animation:gl2 4.3s steps(1) infinite">${nameText("#ff2bd6")}</g>`);
  out.push(`<g style="animation:jolt 4.3s steps(1) infinite" filter="url(#glow)">${nameText("url(#name)")}</g>`);
  out.push(`<text x="${NX}" y="${NY + 26}" class="handle" text-anchor="middle">@${esc(login)}</text>`);

  // typed lines, each centered
  typed.forEach((l) => (l.x = f1(W / 2 - (l.text.length * CW) / 2)));
  typed.forEach((l, i) => {
    const w = f1(l.text.length * CW), TX = l.x;
    const frames = [[0, "transform:scaleX(0)"], [l.start, `transform:scaleX(0);animation-timing-function:steps(${l.text.length})`],
      [l.typed, "transform:scaleX(1)", TW], [l.erase, `transform:scaleX(1);animation-timing-function:steps(${l.text.length})`], [l.end, "transform:scaleX(0)", TW]];
    defs.push(`<clipPath id="ln${i}"><rect x="${TX}" y="${TY - 18}" width="${w}" height="26" ${anim(`ln${i}`, frames, "fbl")}/></clipPath>`);
    out.push(`<text x="${TX}" y="${TY}" class="line" textLength="${w}" lengthAdjust="spacing" clip-path="url(#ln${i})">${esc(l.text)}</text>`);
  });
  // the cursor rides the end of whatever is typed
  const cur = [[0, `transform:translateX(${typed[0].x}px)`]];
  typed.forEach((l) => {
    const endX = f1(l.x + l.text.length * CW);
    cur.push([l.start, `transform:translateX(${l.x}px);animation-timing-function:steps(${l.text.length})`],
      [l.typed, `transform:translateX(${endX}px)`, TW],
      [l.erase, `transform:translateX(${endX}px);animation-timing-function:steps(${l.text.length})`],
      [l.end, `transform:translateX(${l.x}px)`, TW]);
  });
  out.push(`<g ${anim("cur", cur)}><rect x="1" y="${TY - 15}" width="9" height="19" fill="#7ee8fa" style="animation:blink 1s steps(1) infinite"/></g>`);
  css.push(`@keyframes blink{50%{opacity:0}}`);

  // a thin neon rule
  out.push(`<rect x="${W / 2 - 220}" y="${NY + 38}" width="440" height="1" fill="url(#name)" opacity=".5"/>`);

  const style = `
    .m{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .fbl{transform-box:fill-box;transform-origin:left center}
    .name{font-family:"Segoe UI",-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;font-weight:800;letter-spacing:1px}
    .handle{font:13px ${MONO};fill:#b9a8ff;opacity:.8;letter-spacing:1px}
    .line{font:15px ${MONO};fill:#e8e4ff}
    ${css.join("\n")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(name)}</title>
<defs>${defs.join("")}</defs>
<style>${style}</style>
<g clip-path="url(#frame)">
${out.join("\n")}
</g>
</svg>`;
  return [{ file: "intro.svg", svg }];
}
