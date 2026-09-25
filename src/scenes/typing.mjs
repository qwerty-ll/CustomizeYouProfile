// Typewriter text that works everywhere: each character fades in on its own
// keyframe (and is backspaced from the end), instead of animating a clipPath,
// which Safari ignores inside <img> SVGs.

import { TW, esc, f1 } from "../lib.mjs";

// Code points, with emoji and other astral characters counted as two cells wide.
export function cells(text) {
  return Array.from(text).map((ch) => ({ ch, w: ch.codePointAt(0) > 0xffff ? 2 : 1 }));
}
export const cellWidth = (text) => cells(text).reduce((s, c) => s + c.w, 0);

// Schedule lines one after another: type, hold, backspace, pause.
export function scheduleLines(texts, { start = 0.9, type = 0.055, erase = 0.025, hold = 1.8, gap = 0.35 } = {}) {
  let t = start;
  const lines = texts.map((text) => {
    const n = cells(text).length;
    const l = { text, n, start: t, typed: t + n * type, type, erase };
    l.erase = l.typed + hold;
    l.end = l.erase + n * erase;
    l.eraseStep = erase;
    t = l.end + gap;
    return l;
  });
  return { lines, end: t };
}

// Render scheduled lines at (x, y). `anim(name, frames, cls)` comes from the effect.
// Returns the characters plus a cursor that follows the typing.
export function typewriter(lines, { x, y, cw, anim, prefix, cls, cursor }) {
  let out = "";
  const cur = [];
  lines.forEach((l, li) => {
    const lx = typeof x === "function" ? x(l) : x;
    l.x = lx;
    let col = 0;
    cells(l.text).forEach(({ ch, w }, i) => {
      const on = l.start + (i + 1) * l.type, off = l.erase + (l.n - i) * l.eraseStep;
      if (ch.trim()) {
        out += `<text x="${f1(lx + col * cw)}" y="${y}" ${anim(`${prefix}${li}_${i}`, [[0, "opacity:0"], [on, "opacity:1"], [off, "opacity:0"]], cls)}>${esc(ch)}</text>`;
      }
      col += w;
    });
    l.width = col * cw;
    const endX = f1(lx + l.width);
    cur.push([l.start, `transform:translateX(${f1(lx)}px);animation-timing-function:steps(${Math.max(1, l.n)})`],
      [l.typed, `transform:translateX(${endX}px)`, TW],
      [l.erase, `transform:translateX(${endX}px);animation-timing-function:steps(${Math.max(1, l.n)})`],
      [l.end, `transform:translateX(${f1(lx)}px)`, TW]);
  });
  if (cursor) {
    const first = [0, `transform:translateX(${f1(lines[0]?.x ?? 0)}px)`];
    out += `<g ${anim(`${prefix}cur`, [first, ...cur])}><rect x="1" y="${y - cursor.h + 4}" width="${cursor.w}" height="${cursor.h}" rx="1" fill="${cursor.color}" style="animation:${prefix}blink 1s steps(1) infinite"/></g>`;
    out += `<style>@keyframes ${prefix}blink{50%{opacity:0}}</style>`;
  }
  return out;
}
