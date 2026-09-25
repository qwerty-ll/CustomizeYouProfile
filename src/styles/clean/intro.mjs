// The calm intro: a waving hand, "Hi, I'm <name>", lines about you typed one
// after another, and a row of quiet stat pills. Transparent background, GitHub
// colors, light and dark files.

import { GH_THEMES, MONO, SANS, esc, f1, keyframeBuilder } from "../../lib.mjs";
import { cellWidth, scheduleLines, typewriter } from "../../scenes/typing.mjs";

export default function render(ctx, options = {}) {
  return [
    { file: "intro.svg", svg: draw(GH_THEMES.light, ctx, options) },
    { file: "intro-dark.svg", svg: draw(GH_THEMES.dark, ctx, options) },
  ];
}

function draw(T, { login, profile, total }, options) {
  const W = 860, H = 196, CW = 8.6, TY = 128;
  const name = options.name || profile.name || login;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const top = profile.languages[0]?.name;
  const texts = options.tagline?.length ? [...options.tagline] : [
    `${plural(total, "contribution")} in the last year`,
    top ? `mostly writing ${top}` : "building things on GitHub",
    `${plural(profile.repos, "public repo")} and counting`,
  ];
  const modes = options.modes ?? {};
  if (modes.birthday) texts.unshift(modes.text.birthdayLine);
  for (const c of modes.countdowns ?? []) texts.push(`⏳ ${c.text}`);
  const { lines, end: DURATION } = scheduleLines(texts.map((t) => t.slice(0, 80)));

  const keyframes = keyframeBuilder(DURATION);
  const css = [], out = [];
  const anim = (n, frames, cls = "") => (css.push(keyframes(n, frames)), `class="m ${cls}" style="animation-name:${n}"`);

  // waving hand
  css.push(`@keyframes wave{0%,60%,100%{transform:rotate(0)}10%,30%{transform:rotate(14deg)}20%{transform:rotate(-8deg)}40%{transform:rotate(-4deg)}50%{transform:rotate(10deg)}}`);
  out.push(`<text x="${W / 2}" y="40" text-anchor="middle" class="hand" style="transform-box:fill-box;transform-origin:70% 70%;animation:wave 2.6s ease-in-out infinite">👋</text>`);
  // greeting
  const size = Math.min(38, Math.floor(700 / Math.max(8, (name.length + 8) * 0.6)));
  out.push(`<text x="${W / 2}" y="88" text-anchor="middle" class="hi" font-size="${size}">Hi, I'm <tspan class="name">${esc(name)}</tspan></text>`);
  // typed lines, centered, with an accent cursor
  out.push(typewriter(lines, {
    x: (l) => W / 2 - (cellWidth(l.text) * CW) / 2, y: TY, cw: CW, anim, prefix: "t", cls: "line",
    cursor: { w: 2.5, h: 18, color: T.accent },
  }));

  // stat pills
  const pills = [`⭐ ${plural(profile.stars, "star")}`, `📦 ${plural(profile.repos, "repo")}`, `🔥 ${plural(profile.longestStreak, "day")} best streak`];
  const PW = (p) => cellWidth(p) * 7.1 + 26;
  const totalW = pills.reduce((s, p) => s + PW(p), 0) + (pills.length - 1) * 10;
  let px = W / 2 - totalW / 2;
  for (const p of pills) {
    const w = PW(p);
    out.push(`<rect x="${f1(px)}" y="152" width="${f1(w)}" height="26" rx="13" fill="${T.subtle}" stroke="${T.border}"/>`);
    out.push(`<text x="${f1(px + w / 2)}" y="169" text-anchor="middle" class="pill">${esc(p)}</text>`);
    px += w + 10;
  }

  const style = `
    .m{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .hand{font-size:26px}
    .hi{font-family:${SANS};font-weight:400;fill:${T.muted}}
    .name{font-weight:700;fill:${T.fg}}
    .line{font:15px ${MONO};fill:${T.fg}}
    .pill{font:12px ${SANS};fill:${T.muted}}
    ${css.join("\n")}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-bg="${T.name}">
<title>${esc(name)}</title>
<style>${style}</style>
${out.join("\n")}
</svg>`;
}
