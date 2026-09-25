// Your GitHub profile as an RPG character sheet: avatar, level from the year's
// contributions, an XP bar, six stats, a class from your top language and
// achievements that unlock one by one.

import { MONO, TW, esc, f1, keyframeBuilder } from "../lib.mjs";

const CLASSES = {
  JavaScript: "Sorcerer", TypeScript: "Paladin", Python: "Mage", Java: "Knight", "C#": "Warlock",
  "C++": "Berserker", C: "Ancient Warrior", Go: "Ranger", Rust: "Blacksmith", Ruby: "Bard",
  PHP: "Alchemist", Swift: "Rogue", Kotlin: "Druid", Dart: "Monk", HTML: "Illusionist",
  CSS: "Illusionist", Shell: "Necromancer", Lua: "Summoner", Vue: "Enchanter", Svelte: "Enchanter",
  "Jupyter Notebook": "Seer", R: "Seer", Scala: "Templar", Haskell: "Oracle", Elixir: "Shaman",
};

export default function render({ login, profile, total }, options = {}) {
  const W = 860, H = 320;
  const lang = profile.languages[0]?.name;
  const klass = `${lang ? `${lang} ` : ""}${CLASSES[lang] ?? "Adventurer"}`;
  const raw = Math.sqrt(total) * 1.2 + 1;
  const level = Math.floor(raw), xp = raw - level;
  const years = (Date.now() - new Date(profile.createdAt)) / (365.25 * 864e5);

  const STATS = [
    ["STR", "commits this year", profile.yearCommits, 1500, "#ff6b6b"],
    ["INT", "public repos", profile.repos, 80, "#4dabf7"],
    ["DEX", "pull requests", profile.pullRequests, 300, "#51cf66"],
    ["CHA", "followers", profile.followers, 500, "#f783ac"],
    ["VIT", "longest streak", profile.longestStreak, 60, "#ffa94d"],
    ["LUK", "stars earned", profile.stars, 500, "#ffd43b"],
  ];
  const BADGES = [
    ["🌱", "First steps", total > 0],
    ["🔥", "Week streak", profile.longestStreak >= 7],
    ["🌍", "Polyglot", profile.languages.length >= 5],
    ["⭐", "Star collector", profile.stars >= 10],
    ["🤝", "Team player", profile.pullRequests >= 10],
    ["👥", "Influencer", profile.followers >= 25],
    ["🏃", "Marathon", profile.activeDays >= 100],
    ["🛡️", "Veteran", years >= 3],
  ];

  // ---------- timeline ----------
  const T_XP = 0.8, T_STATS = 1.4, STAT_GAP = 0.18, T_BADGES = T_STATS + STATS.length * STAT_GAP + 0.3, BADGE_GAP = 0.22;
  const DURATION = T_BADGES + BADGES.length * BADGE_GAP + 5.5;
  const keyframes = keyframeBuilder(DURATION);
  const css = [];
  const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);
  const OUT = [DURATION - 0.6, DURATION - 0.1];   // everything resets before the loop restarts
  const EASE = "animation-timing-function:cubic-bezier(.2,.8,.3,1)";

  const defs = [], out = [];
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>`);
  defs.push(`<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1530"/><stop offset="1" stop-color="#0c0a16"/></linearGradient>`);
  defs.push(`<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe7a3"/><stop offset=".5" stop-color="#c9973b"/><stop offset="1" stop-color="#ffe7a3"/></linearGradient>`);
  defs.push(`<linearGradient id="xp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7048e8"/><stop offset="1" stop-color="#e599f7"/></linearGradient>`);
  defs.push(`<linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`);
  defs.push(`<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  defs.push(`<clipPath id="avatar"><circle cx="112" cy="112" r="58"/></clipPath>`);

  // card
  out.push(`<rect width="${W}" height="${H}" fill="url(#bg)"/>`);
  out.push(`<rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="12" fill="none" stroke="url(#gold)" stroke-width="2"/>`);
  out.push(`<rect x="14" y="14" width="${W - 28}" height="${H - 28}" rx="9" fill="none" stroke="#c9973b" stroke-opacity=".35"/>`);
  for (const [cx, cy] of [[8, 8], [W - 8, 8], [8, H - 8], [W - 8, H - 8]])
    out.push(`<path d="M${cx} ${cy - 9}L${cx + 9} ${cy}L${cx} ${cy + 9}L${cx - 9} ${cy}Z" fill="url(#gold)"/>`);

  // avatar with a pulsing aura
  css.push(`@keyframes aura{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.75;transform:scale(1.06)}}`);
  out.push(`<circle cx="112" cy="112" r="66" fill="none" stroke="#b197fc" stroke-width="4" filter="url(#glow)" style="transform-box:fill-box;transform-origin:center;animation:aura 3s ease-in-out infinite"/>`);
  out.push(options.avatar
    ? `<image href="${options.avatar}" x="54" y="54" width="116" height="116" clip-path="url(#avatar)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="112" cy="112" r="58" fill="#3b2f6b"/><text x="112" y="126" text-anchor="middle" class="initial">${esc((profile.name || login)[0].toUpperCase())}</text>`);
  out.push(`<circle cx="112" cy="112" r="60" fill="none" stroke="url(#gold)" stroke-width="3"/>`);
  out.push(`<rect x="72" y="160" width="80" height="22" rx="11" fill="#1b1530" stroke="url(#gold)" stroke-width="1.5"/><text x="112" y="175" text-anchor="middle" class="lvl">LV ${level}</text>`);
  out.push(`<text x="112" y="208" text-anchor="middle" class="name">${esc(profile.name || login)}</text>`);
  out.push(`<text x="112" y="226" text-anchor="middle" class="klass">${esc(klass)}</text>`);

  // XP bar
  const XX = 230, XW = W - XX - 40;
  out.push(`<text x="${XX}" y="46" class="label">EXPERIENCE</text><text x="${XX + XW}" y="46" class="label" text-anchor="end">${total} contributions · next level ${Math.round(xp * 100)}%</text>`);
  out.push(`<rect x="${XX}" y="54" width="${XW}" height="12" rx="6" fill="#2a2340"/>`);
  out.push(`<rect x="${XX}" y="54" width="${f1(Math.max(12, XW * xp))}" height="12" rx="6" fill="url(#xp)" filter="url(#glow)" ${anim("xp", [
    [0, "transform:scaleX(0)"], [T_XP, `transform:scaleX(0);${EASE}`], [T_XP + 1.2, "transform:scaleX(1)", TW], [OUT[0], "transform:scaleX(1)"], [OUT[1], "transform:scaleX(0)", TW],
  ], "fbl")}/>`);

  // stats, log-scaled so small and huge profiles both read well
  STATS.forEach(([key, label, value, ref, color], i) => {
    const y = 96 + i * 26, bw = XW - 170;
    const frac = Math.min(1, Math.log1p(value) / Math.log1p(ref));
    const t0 = T_STATS + i * STAT_GAP;
    out.push(`<text x="${XX}" y="${y + 9}" class="key" fill="${color}">${key}</text><text x="${XX + 38}" y="${y + 9}" class="label">${label}</text>`);
    out.push(`<rect x="${XX + 160}" y="${y}" width="${bw}" height="10" rx="5" fill="#2a2340"/>`);
    out.push(`<rect x="${XX + 160}" y="${y}" width="${f1(Math.max(10, bw * frac))}" height="10" rx="5" fill="${color}" ${anim(`st${i}`, [
      [0, "transform:scaleX(0)"], [t0, `transform:scaleX(0);${EASE}`], [t0 + 0.9, "transform:scaleX(1)", TW], [OUT[0], "transform:scaleX(1)"], [OUT[1], "transform:scaleX(0)", TW],
    ], "fbl")}/>`);
    out.push(`<text x="${XX + XW}" y="${y + 9}" text-anchor="end" ${anim(`sv${i}`, [
      [0, "opacity:0"], [t0 + 0.5, "opacity:0"], [t0 + 0.9, "opacity:1", TW], [OUT[0], "opacity:1"], [OUT[1], "opacity:0", TW],
    ], "val")}>${value}</text>`);
  });

  // achievements
  const BY = 284, BX = XX, BGAP = (XW - 30) / (BADGES.length - 1);
  out.push(`<text x="${BX}" y="${BY - 20}" class="label">ACHIEVEMENTS · ${BADGES.filter((b) => b[2]).length}/${BADGES.length}</text>`);
  BADGES.forEach(([icon, label, unlocked], i) => {
    const cx = f1(BX + 15 + i * BGAP), t0 = T_BADGES + i * BADGE_GAP;
    const inner = `<circle cx="${cx}" cy="${BY}" r="14" fill="${unlocked ? "#2d2150" : "#1a1626"}" stroke="${unlocked ? "url(#gold)" : "#3a3450"}" stroke-width="1.5"/>
      <text x="${cx}" y="${BY + 5}" text-anchor="middle" class="icon"${unlocked ? "" : ` opacity=".25"`}>${icon}</text>
      ${unlocked ? "" : `<text x="${cx + 9}" y="${BY + 13}" text-anchor="middle" class="lock">🔒</text>`}<title>${label}${unlocked ? "" : " (locked)"}</title>`;
    out.push(`<g ${anim(`bd${i}`, unlocked
      ? [[0, "opacity:0;transform:scale(.2)"], [t0, `opacity:0;transform:scale(.2);animation-timing-function:cubic-bezier(.3,1.6,.5,1)`], [t0 + 0.4, "opacity:1;transform:scale(1)", TW], [OUT[0], "opacity:1;transform:scale(1)"], [OUT[1], "opacity:0;transform:scale(1)", TW]]
      : [[0, "opacity:0;transform:scale(1)"], [t0, "opacity:0;transform:scale(1)"], [t0 + 0.3, "opacity:.8;transform:scale(1)", TW], [OUT[0], "opacity:.8;transform:scale(1)"], [OUT[1], "opacity:0;transform:scale(1)", TW]], "fb")}>${inner}</g>`);
  });

  // a shine sweeps across the card once the sheet is filled in
  out.push(`<g transform="skewX(-20)"><rect x="-200" y="0" width="160" height="${H}" fill="url(#shine)" ${anim("shine", [
    [0, "transform:translateX(0)"], [T_BADGES + BADGES.length * BADGE_GAP + 0.6, "transform:translateX(0)"], [T_BADGES + BADGES.length * BADGE_GAP + 2, `transform:translateX(${W + 400}px)`, TW],
  ])}/></g>`);

  const style = `
    .m{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .fb{transform-box:fill-box;transform-origin:center}
    .fbl{transform-box:fill-box;transform-origin:left center}
    .name{font:bold 16px "Segoe UI",-apple-system,Helvetica,Arial,sans-serif;fill:#fff4d6}
    .klass{font:italic 12px Georgia,serif;fill:#d0bfff}
    .lvl{font:bold 12px ${MONO};fill:#ffe7a3;letter-spacing:1px}
    .label{font:10px ${MONO};fill:#9d93c7;letter-spacing:1px}
    .key{font:bold 11px ${MONO}}
    .val{font:bold 11px ${MONO};fill:#fff4d6}
    .icon{font-size:14px}
    .lock{font-size:8px}
    .initial{font:bold 48px Georgia,serif;fill:#e5dbff}
    ${css.join("\n")}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${esc(login)}: level ${level} ${esc(klass)}</title>
<defs>${defs.join("")}</defs>
<style>${style}</style>
<g clip-path="url(#frame)">
${out.join("\n")}
</g>
</svg>`;
  return [{ file: "rpg-card.svg", svg }];
}
