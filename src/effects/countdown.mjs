// Days left until up to three dates, on flip-clock cards that tick over now
// and then. Turned on by the `countdown` input; refreshed with every daily run.

import { MONO, esc, f1 } from "../lib.mjs";

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ru: ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
};

export default function render({ login }, options = {}) {
  const modes = options.modes;
  const items = modes?.countdowns ?? [];
  const W = 860, H = 180;
  const css = [], defs = [], out = [];
  const lang = modes?.language === "ru" ? "ru" : "en";
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>`);
  defs.push(`<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#101428"/><stop offset="1" stop-color="#1c1033"/></linearGradient>`);
  defs.push(`<linearGradient id="card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2f4a"/><stop offset=".5" stop-color="#23263d"/><stop offset=".5" stop-color="#1b1d30"/><stop offset="1" stop-color="#15172a"/></linearGradient>`);
  defs.push(`<linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7ee8fa"/><stop offset=".5" stop-color="#c77dff"/><stop offset="1" stop-color="#ff5fa2"/></linearGradient>`);
  defs.push(`<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  out.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  let stars = "";
  for (let i = 0; i < 40; i++) stars += `<circle cx="${(i * 97) % W}" cy="${(i * 53) % H}" r="${i % 7 ? 0.6 : 1.1}" fill="#fff" opacity="${0.15 + (i % 5) * 0.1}"/>`;
  out.push(stars);

  if (!items.length) {
    out.push(`<text x="${W / 2}" y="${H / 2 + 5}" class="label" text-anchor="middle">set the countdown input, e.g. "2026-12-31 Release"</text>`);
  }

  // one flip card per digit; the top flap folds down every few seconds
  css.push(`@keyframes flipTop{0%,88%{transform:scaleY(1)}94%,100%{transform:scaleY(0)}}`);
  css.push(`@keyframes flipBottom{0%,93%{transform:scaleY(0)}100%{transform:scaleY(1)}}`);
  const slot = (W - 40) / Math.max(1, items.length);
  items.forEach((c, i) => {
    const cx = 20 + slot * i + slot / 2;
    const n = Math.abs(c.days), digits = String(n).split("");
    const DW = digits.length > 3 ? 40 : 50, DH = 66, GAP = 8;
    const total = digits.length * DW + (digits.length - 1) * GAP;
    const x0 = cx - total / 2, y0 = 44;
    const done = c.days === 0, past = c.days < 0;
    out.push(`<text x="${f1(cx)}" y="30" class="label" text-anchor="middle">${esc(c.label)}</text>`);
    digits.forEach((d, k) => {
      const x = f1(x0 + k * (DW + GAP)), delay = f1(-(i * 1.3 + k * 0.25));
      const digit = (clip) => `<text x="${f1(x + DW / 2)}" y="${y0 + DH / 2 + 17}" class="digit" text-anchor="middle"${clip}>${d}</text>`;
      out.push(`<g filter="url(#glow)">
        <rect x="${x}" y="${y0}" width="${DW}" height="${DH}" rx="8" fill="url(#card)" stroke="${done ? "#ffd43b" : "#3b3f63"}"/>
        ${digit("")}
        <rect x="${x}" y="${y0 + DH / 2 - 0.5}" width="${DW}" height="1.5" fill="#0b0c18"/>
      </g>`);
      // flap: the upper half folds over and the lower half unfolds (same digit, it's a daily count)
      defs.push(`<clipPath id="t${i}_${k}"><rect x="${x}" y="${y0}" width="${DW}" height="${DH / 2}"/></clipPath><clipPath id="b${i}_${k}"><rect x="${x}" y="${y0 + DH / 2}" width="${DW}" height="${DH / 2}"/></clipPath>`);
      out.push(`<g style="transform-origin:${f1(x + DW / 2)}px ${y0 + DH / 2}px;animation:flipTop 6s ease-in ${delay}s infinite"><g clip-path="url(#t${i}_${k})"><rect x="${x}" y="${y0}" width="${DW}" height="${DH}" rx="8" fill="url(#card)"/>${digit("")}</g></g>`);
      out.push(`<g style="transform-origin:${f1(x + DW / 2)}px ${y0 + DH / 2}px;animation:flipBottom 6s ease-out ${delay}s infinite"><g clip-path="url(#b${i}_${k})"><rect x="${x}" y="${y0}" width="${DW}" height="${DH}" rx="8" fill="url(#card)"/>${digit("")}</g></g>`);
    });
    const [yy, mm, dd] = c.iso.split("-");
    const when = lang === "ru" ? `${+dd} ${MONTHS.ru[+mm - 1]} ${yy}` : `${MONTHS.en[+mm - 1]} ${+dd}, ${yy}`;
    const status = done ? modes.text.today(c.label) : past ? modes.text.ago(n, c.label) : modes.text.days(n);
    out.push(`<text x="${f1(cx)}" y="${y0 + DH + 26}" class="${done ? "big done" : "big"}" text-anchor="middle"${done ? ` filter="url(#glow)"` : ""}>${esc(status)}</text>`);
    out.push(`<text x="${f1(cx)}" y="${y0 + DH + 44}" class="date" text-anchor="middle">${when}</text>`);
    if (i > 0) out.push(`<rect x="${f1(20 + slot * i)}" y="24" width="1" height="${H - 48}" fill="#fff" opacity=".08"/>`);
  });

  const style = `
    .label{font:bold 13px ${MONO};fill:#d0bfff;letter-spacing:1.5px;text-transform:uppercase}
    .digit{font:bold 44px ${MONO};fill:#f8f9ff}
    .big{font:bold 14px ${MONO};fill:url(#accent)}
    .done{fill:#ffd43b}
    .date{font:11px ${MONO};fill:#8f88b8}
    ${css.join("\n")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(login)}: countdown</title>
<defs>${defs.join("")}</defs>
<style>${style}</style>
<g clip-path="url(#frame)">
${out.join("\n")}
</g>
</svg>`;
  return [{ file: "countdown.svg", svg }];
}
