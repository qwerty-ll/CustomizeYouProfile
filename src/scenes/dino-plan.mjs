// Shared dino-run timeline: which days become obstacles, where they stand in
// the world, and the jump for each group (apex chosen so the feet always clear).
// Used by every dino style so the physics stays identical.

import { rng, seedFor, topDays } from "../lib.mjs";

export function planDino({ login, days: allDays, maxCount }, { H = 230, GROUND = 186 } = {}) {
  const days = allDays.map((d) => ({ ...d }));
  // ---------- layout ----------
  const W = 860;
  const DX = 96;                 // dino left edge on screen
  const PX = 2;                  // dino pixel size
  const DINO_W = 40, DINO_H = 36;
  const FEET = [6, 26];          // x-range of the feet inside the dino, for collision
  const DAY = 14;                // world px per day
  const V = 190;                 // run speed, px/s
  const RUN_IN = 320;            // world x of the first day
  const LEAD = 30, LAND = 24, MIN_GAP = 90, MAX_GROUP = 3, MERGE_DAYS = 3, MAX_JUMP = GROUND - DINO_H - 50;
  const FONT = `ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
  const random = rng(seedFor(login, 20260925));

  days.forEach((d, i) => (d.wx = RUN_IN + i * DAY));
  const underDino = (wx) => (wx - DINO_W / 2) / V;   // time a world x passes the dino's middle

  // ---------- cacti & jumps ----------
  // Only the 40 biggest days become cacti, so busy profiles stay jumpable.
  const cactusDays = new Set(topDays(days, 40).map((d) => d.index));
  const peak = Math.max(1, maxCount);
  const groups = [];
  let prevEnd = -Infinity, prevDay = -Infinity;
  for (const [i, d] of days.entries()) {
    if (!cactusDays.has(d.index)) continue;
    const level = Math.max(1, d.level);
    const h = Math.round(18 + 38 * Math.sqrt(d.count / peak));
    const cw = 6 + level + 2 * 7;
    let g = groups.at(-1), x;
    // Days close together share one jump; otherwise make room for a fresh jump.
    if (g && i - prevDay <= MERGE_DAYS && g.cacti.length < MAX_GROUP) x = Math.max(d.wx, prevEnd + 3);
    else groups.push((g = { cacti: [] })), (x = Math.max(d.wx, prevEnd + MIN_GAP));
    prevDay = i;
    g.cacti.push({ x, h, cw, level, count: d.count, date: d.date, index: d.index });
    prevEnd = x + cw;
  }

  for (const g of groups) {
    g.gx = g.cacti[0].x;
    g.gw = g.cacti.at(-1).x + g.cacti.at(-1).cw - g.gx;
    g.maxH = Math.max(...g.cacti.map((c) => c.h));
    g.sum = g.cacti.reduce((s, c) => s + c.count, 0);
    g.level = Math.max(...g.cacti.map((c) => c.level));
    g.tUp = (g.gx - FEET[1] - LEAD) / V;
    g.tDown = (g.gx + g.gw - FEET[0] + LAND) / V;
    g.T = g.tDown - g.tUp;
    g.tMid = g.tUp + g.T / 2;
    // Smallest apex that keeps the feet above every cactus while they overlap.
    let need = 0;
    for (const c of g.cacti) {
      for (const t of [(c.x - FEET[1]) / V, (c.x + c.cw - FEET[0]) / V]) {
        const s = Math.min(Math.max((t - g.tUp) / g.T, 0.02), 0.98);
        need = Math.max(need, (c.h + 5) / (4 * s * (1 - s)));
      }
    }
    g.apex = Math.min(MAX_JUMP, Math.max(need, g.maxH + 14));
  }

  const lastDayT = underDino(days.at(-1).wx);
  const RUN_END = Math.max(lastDayT, groups.at(-1)?.tDown ?? 0) + 0.6;
  const DURATION = RUN_END + 0.7 + 3;

  // Score = every commit the dino has run past so far, not only the cactus days.
  const prefix = [];
  days.reduce((sum, d, i) => (prefix[i] = sum + d.count), 0);
  return { W, H, GROUND, DX, PX, DINO_W, DINO_H, FEET, DAY, V, RUN_IN, FONT, random, days, underDino, groups, lastDayT, RUN_END, DURATION, prefix };
}
