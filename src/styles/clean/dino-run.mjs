// The calm take on dino-run, styled after Chrome's offline T-rex game: a flat
// grey dino on a clean background, cacti in GitHub's contribution greens,
// drifting clouds, a HI/score counter and a "GAME OVER" finale.
// Comes as a light and a dark file that follow the viewer's GitHub theme.

import { GH_THEMES, TW, keyframeBuilder, rng, seedFor } from "../../lib.mjs";
import { BODY, LEGS, SANTA_HAT, obstacleKit, pixels } from "../../scenes/dino-obstacles.mjs";
import { planDino } from "../../scenes/dino-plan.mjs";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export default function render(ctx, options = {}) {
  const plan = planDino(ctx);
  return [
    { file: "dino-run.svg", svg: draw(plan, GH_THEMES.light, ctx, options) },
    { file: "dino-run-dark.svg", svg: draw(plan, GH_THEMES.dark, ctx, options) },
  ];
}

function draw(P, T, { login, total, maxCount }, options) {
  const { W, H, GROUND, DX, DINO_W, DINO_H, V, FONT, days, underDino, groups, lastDayT, RUN_END, DURATION, prefix } = P;
  const random = rng(seedFor(login, 4040));
  const modes = options.modes ?? {};
  const f = (n) => +n.toFixed(1);
  const keyframes = keyframeBuilder(DURATION);
  const css = [], defs = [], out = [];
  const anim = (name, frames, cls = "") => (css.push(keyframes(name, frames)), `class="m ${cls}" style="animation-name:${name}"`);
  const parallax = (name, period, speed, content) => {
    css.push(`@keyframes ${name}{from{transform:translateX(0)}to{transform:translateX(-${period}px)}}`);
    return `<g style="animation:${name} ${(period / speed).toFixed(3)}s linear infinite">${content}<g transform="translate(${period},0)">${content}</g></g>`;
  };
  defs.push(`<clipPath id="frame"><rect width="${W}" height="${H}" rx="12"/></clipPath>`);

  // night sky only in the dark version: a few stars and a pixel moon, like Chrome's night mode
  if (T.name === "dark") {
    let stars = "";
    for (let i = 0; i < 28; i++)
      stars += `<rect x="${f(random() * W)}" y="${f(46 + random() * 80)}" width="2" height="2" fill="${T.muted}" style="animation:tw ${f(2 + random() * 3)}s steps(2) ${f(-random() * 3)}s infinite alternate"/>`;
    css.push(`@keyframes tw{from{opacity:.2}to{opacity:.8}}`);
    out.push(stars);
    out.push(`<g transform="translate(${W - 150},58)" fill="${T.ink}" opacity=".85"><path d="M8 0h6v2h2v2h2v4h2v8h-2v4h-2v2h-2v2h-6v-2h4v-2h2v-4h2v-8h-2v-4h-2v-2h-4z"/></g>`);
  }
  // clouds drift slowly (Chrome-style outlined pixel clouds)
  const cloud = (x, y) => `<path transform="translate(${x},${y})" d="M8 10h4v-4h4v-2h8v2h4v4h4v2h4v4h-32v-4h4z" fill="${T.name === "dark" ? T.cloud : "#fff"}" stroke="${T.cloud}" stroke-width="1.5"/>`;
  out.push(parallax("clouds", W, V * 0.12, [cloud(120, 64), cloud(420, 88), cloud(690, 58)].join("")));

  // ground: a line with little bumps, plus pebbles and dashes that scroll at run speed
  let bumps = "";
  for (let x = 0; x < W; x += 60 + Math.floor(random() * 80)) bumps += `<path d="M${x} ${GROUND}h6l2 -2h6l2 2h6" fill="none" stroke="${T.ink}" stroke-width="1.2"/>`;
  let pebbles = "";
  for (let i = 0; i < 46; i++) pebbles += `<rect x="${f(random() * W)}" y="${f(GROUND + 4 + random() * 12)}" width="${1 + Math.floor(random() * 3) * 2}" height="1.5" fill="${T.ink}" opacity="${f(0.35 + random() * 0.4)}"/>`;
  out.push(`<rect x="0" y="${GROUND}" width="${W}" height="1.5" fill="${T.ink}"/>`);
  out.push(parallax("ground", W, V, bumps + pebbles));

  // world: obstacles, month markers, score popups
  const kit = obstacleKit(GROUND, { cactusFill: (level) => T.levels[level] });
  defs.push(...kit.defs);
  css.push(...kit.css);
  const world = [];
  for (const d of days) {
    if (!d.date.endsWith("-01")) continue;
    world.push(`<text x="${d.wx + 3}" y="${GROUND + 30}" class="gl">${MONTHS[Number(d.date.slice(5, 7)) - 1]}</text>`);
  }
  groups.forEach((g, i) => {
    world.push(`<g ${anim(`g${i}`, [[0, "opacity:1"], [g.tMid, "opacity:1"], [g.tDown + 0.3, "opacity:.3", TW]])}>${g.cacti.map((c) => kit.obstacle(c, modes)).join("")}</g>`);
    world.push(`<text x="${f(g.gx + g.gw / 2)}" y="${GROUND - g.maxH - 10}" fill="${T.levels[Math.min(4, g.level + (T.name === "light" ? 1 : 0))] ?? T.success}" ${anim(`pop${i}`, [
      [0, "opacity:0;transform:translateY(0)"], [g.tMid, "opacity:1;transform:translateY(0)"],
      [g.tMid + 1.1, "opacity:0;transform:translateY(-24px)", TW],
    ], "pop")}>+${g.sum}</text>`);
  });
  out.push(`<g transform="translate(${DX},0)"><g ${anim("world", [[0, "transform:translateX(0)"], [DURATION, `transform:translateX(-${f(V * DURATION)}px)`, TW]])}>${world.join("")}</g></g>`);

  // the dino: same jump arcs as every style, without the glow
  const dinoFrames = [[0, "transform:translate(0,0)"]], legFrames = [[0, "opacity:1"]], dust = [];
  groups.forEach((g, i) => {
    dinoFrames.push([g.tUp, "transform:translate(0,0)"]);
    for (let k = 1; k <= 14; k++) {
      const s = k / 14;
      dinoFrames.push([g.tUp + g.T * s, `transform:translate(0,${f(-g.apex * 4 * s * (1 - s))}px)`, TW]);
    }
    legFrames.push([g.tUp, "opacity:0"], [g.tDown, "opacity:1"]);
    for (let k = 0; k < 4; k++)
      dust.push(`<rect x="${DX + 12 + k * 3}" y="${GROUND - 3}" width="2" height="2" fill="${T.ink}" ${anim(`d${i}_${k}`, [
        [0, "opacity:0;transform:translate(0,0)"], [g.tDown, "opacity:.8;transform:translate(0,0)"],
        [g.tDown + 0.35, `opacity:0;transform:translate(${f(-(6 + random() * 16))}px,${f(-(1 + random() * 5))}px)`, TW],
      ])}/>`);
  });
  css.push(`@keyframes legA{0%{opacity:1}50%{opacity:0}}@keyframes legB{0%{opacity:0}50%{opacity:1}}`);
  css.push(keyframes("dino", dinoFrames));
  out.push(dust.join(""));
  out.push(`<g transform="translate(${DX},${GROUND - DINO_H + 1})"><g class="m" style="animation-name:dino">
    <path d="${pixels(BODY, "#")}" fill="${T.ink}"/>
    <path d="${pixels(BODY, "e")}" fill="${T.bg}"/>${modes.newYear ? SANTA_HAT : ""}
    <g ${anim("run", legFrames)}>
      <path d="${pixels(LEGS.a, "#", 14)}" fill="${T.ink}" style="animation:legA .22s steps(1) infinite"/>
      <path d="${pixels(LEGS.b, "#", 14)}" fill="${T.ink}" style="animation:legB .22s steps(1) infinite"/>
    </g>
    <path d="${pixels(LEGS.stand, "#", 14)}" fill="${T.ink}" ${anim("stand", legFrames.map(([t, v]) => [t, v === "opacity:1" ? "opacity:0" : "opacity:1"]))}/>
  </g></g>`);

  // HUD: month on the left, HI + score on the right, thin progress line
  const pad = (n) => String(n).padStart(5, "0");
  const months = [{ t: 0, label: `${MONTHS[Number(days[0].date.slice(5, 7)) - 1]} ${days[0].date.slice(0, 4)}` }];
  for (const d of days) if (d.date.endsWith("-01")) months.push({ t: underDino(d.wx), label: `${MONTHS[Number(d.date.slice(5, 7)) - 1]} ${d.date.slice(0, 4)}` });
  months.forEach((m, i) => out.push(`<text x="20" y="26" ${anim(`mo${i}`, [[0, `opacity:${i ? 0 : 1}`], [m.t, "opacity:1"], [months[i + 1]?.t ?? DURATION, "opacity:0"]], "hud")}>${m.label}</text>`));
  out.push(`<text x="${W - 92}" y="26" text-anchor="end" class="hud muted">HI ${pad(maxCount)}</text>`);
  const scores = [{ t: 0, v: 0 }];
  groups.forEach((g) => scores.push({ t: g.tMid, v: prefix[g.cacti.at(-1).index] }));
  if (prefix.at(-1) > scores.at(-1).v) scores.push({ t: Math.max(lastDayT, scores.at(-1).t + 0.3), v: prefix.at(-1) });
  scores.forEach((s, i) => out.push(`<text x="${W - 20}" y="26" text-anchor="end" ${anim(`sc${i}`, [[0, `opacity:${i ? 0 : 1}`], [s.t, "opacity:1"], [scores[i + 1]?.t ?? DURATION, "opacity:0"]], "hud")}>${pad(s.v)}</text>`));
  out.push(`<rect x="20" y="36" width="${W - 40}" height="2" rx="1" fill="${T.border}"/>`);
  out.push(`<rect x="20" y="36" width="${W - 40}" height="2" rx="1" fill="${T.success}" ${anim("progress", [[0, "transform:scaleX(0)"], [RUN_END, "transform:scaleX(1)", TW]], "fbl")}/>`);

  // finale: fade to background, "G A M E  O V E R" with a restart button, like the original
  out.push(`<rect width="${W}" height="${H}" fill="${T.bg}" ${anim("scrim", [[0, "opacity:0"], [RUN_END, "opacity:0"], [RUN_END + 0.6, "opacity:.88", TW]])}/>`);
  out.push(`<g ${anim("over", [[0, "opacity:0"], [RUN_END + 0.3, "opacity:0"], [RUN_END + 0.8, "opacity:1", TW], [DURATION - 0.3, "opacity:1"], [DURATION, "opacity:0", TW]])}>
    <text x="${W / 2}" y="${H / 2 - 16}" text-anchor="middle" class="over">GAME OVER</text>
    <g transform="translate(${W / 2 - 17},${H / 2 - 4})"><rect width="34" height="30" rx="4" fill="${T.ink}"/><path d="M17 8a7 7 0 1 0 7 7" fill="none" stroke="${T.bg}" stroke-width="3"/><path d="M20 3l6 5-7 3z" fill="${T.bg}"/></g>
    <text x="${W / 2}" y="${H / 2 + 50}" text-anchor="middle" class="hud muted">${total} contributions · ${months[0].label} → ${months.at(-1).label}</text>
  </g>`);

  const style = `
    .m{animation-duration:${DURATION.toFixed(3)}s;animation-iteration-count:infinite;animation-timing-function:linear;animation-fill-mode:both}
    .fbl{transform-box:fill-box;transform-origin:left center}
    .hud{font:bold 13px ${FONT};fill:${T.ink};letter-spacing:1px}
    .muted{fill:${T.muted}}
    .gl{font:bold 9px ${FONT};fill:${T.muted};letter-spacing:1px}
    .pop{font:bold 12px ${FONT};text-anchor:middle}
    .over{font:bold 20px ${FONT};fill:${T.ink};letter-spacing:9px}
    ${css.join("\n")}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-bg="${T.name}">
<title>${login}: a dino jumping over ${total} contributions</title>
<defs>${defs.join("")}</defs>
<style>${style}</style>
<g clip-path="url(#frame)">
${out.join("\n")}
</g>
</svg>`;
}
