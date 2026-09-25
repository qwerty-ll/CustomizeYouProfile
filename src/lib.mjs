// Shared helpers for every effect.

export const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

export async function fetchCalendar(login, token) {
  // Local dev: CALENDAR_CACHE=/tmp/cal.json reuses one API response across runs.
  const cache = process.env.CALENDAR_CACHE;
  if (cache) {
    const { readFile, writeFile } = await import("node:fs/promises");
    try { return JSON.parse(await readFile(cache, "utf8")); } catch {}
    const cal = await fetchCalendarLive(login, token);
    await writeFile(cache, JSON.stringify(cal));
    return cal;
  }
  return fetchCalendarLive(login, token);
}

async function fetchCalendarLive(login, token) {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
    totalContributions weeks{contributionDays{date weekday contributionCount contributionLevel}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "CustomizeYouProfile" },
    body: JSON.stringify({ query, variables: { login } }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) throw new Error(`GitHub API error for "${login}": ${JSON.stringify(json.errors ?? json)}`);
  if (!json.data?.user) throw new Error(`GitHub user "${login}" not found`);
  return json.data.user.contributionsCollection.contributionCalendar;
}

// Everything an effect gets: the calendar plus a flat, indexed day list with grid coordinates.
export function buildContext(login, calendar) {
  const days = [];
  calendar.weeks.forEach((w, col) =>
    w.contributionDays.forEach((d) =>
      days.push({ ...d, col, row: d.weekday, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 })));
  days.forEach((d, i) => (d.index = i));
  const maxCount = Math.max(0, ...days.map((d) => d.count));
  return { login, calendar, days, weeks: calendar.weeks.length, total: calendar.totalContributions, maxCount };
}

// The `n` biggest days, returned in date order. Keeps busy profiles watchable.
export function topDays(days, n) {
  const active = days.filter((d) => d.count > 0);
  if (active.length <= n) return active;
  const keep = new Set([...active].sort((a, b) => b.count - a.count || a.index - b.index).slice(0, n));
  return active.filter((d) => keep.has(d));
}

// CSS @keyframes builder for one looping timeline of `duration` seconds.
// Frames are [time, css, tween?]. Without `tween` the value jumps at `time`
// instead of easing in from the previous frame, so a hold is inserted just before.
export const TW = true;
export function keyframeBuilder(duration) {
  const HOLD = 0.002;
  const pct = (s) => `${Math.max(0, Math.min(100, (s / duration) * 100)).toFixed(4)}%`;
  return function keyframes(name, frames) {
    // Pin both ends, otherwise CSS eases toward the element's un-animated style.
    if (frames[0][0] > 0) frames = [[0, frames[0][1]], ...frames];
    if (frames.at(-1)[0] < duration) frames = [...frames, [duration, frames.at(-1)[1]]];
    const out = [];
    for (const [s, css, tween] of frames) {
      const prev = out.at(-1);
      if (prev && !tween && s - HOLD > prev[0] && prev[1] !== css) out.push([s - HOLD, prev[1]]);
      out.push([s, css]);
    }
    return `@keyframes ${name}{${out.map(([s, css]) => `${pct(s)}{${css}}`).join("")}}`;
  };
}

// Deterministic PRNG; seeded per user so everyone gets their own scenery,
// and the same scenery every day.
export function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedFor(login, salt) {
  let h = 2166136261 ^ salt;
  for (const ch of login.toLowerCase()) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthName = (date) => MONTHS[Number(date.slice(5, 7)) - 1];
export const f1 = (n) => +n.toFixed(1);
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Group days by calendar month, in order.
export function monthsOf(days) {
  const out = [];
  for (const d of days) {
    const key = d.date.slice(0, 7);
    if (out.at(-1)?.key !== key) out.push({ key, name: monthName(d.date), year: d.date.slice(0, 4), days: [] });
    out.at(-1).days.push(d);
  }
  for (const m of out) m.total = m.days.reduce((s, d) => s + d.count, 0);
  return out;
}

// First day of each graph column, for month labels.
export function monthLabels(days, weeks) {
  const firstOfCol = new Map();
  for (const d of days) if (!firstOfCol.has(d.col)) firstOfCol.set(d.col, d);
  const out = [];
  let lastCol = -3;
  for (const [col, d] of firstOfCol)
    if (Number(d.date.slice(8)) <= 7 && col - lastCol >= 3 && col < weeks - 1) {
      out.push({ col, date: d.date });
      lastCol = col;
    }
  return out;
}

export const GH_DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
export const MONO = `ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace`;
