// Shared helpers for every effect.

export const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

// retryDelays: waits (ms) before each retry of a transient failure; tests pass zeros.
export async function fetchProfile(login, token, { retryDelays = [5000, 20000] } = {}) {
  const live = () => withRetries(() => fetchProfileLive(login, token), retryDelays);
  // Local dev: CALENDAR_CACHE=/tmp/x.json reuses one API response across runs.
  const cache = process.env.CALENDAR_CACHE;
  if (cache) {
    const { readFile, writeFile } = await import("node:fs/promises");
    try {
      const cached = JSON.parse(await readFile(cache, "utf8"));
      if (cached.contributionsCollection) return cached;
    } catch {}
    const user = await live();
    await writeFile(cache, JSON.stringify(user));
    return user;
  }
  return live();
}

// GitHub hiccups (network errors, timeouts, 5xx) are retried, so a daily run
// doesn't fail, and email its owner, over a blip. Other errors fail at once.
export async function withRetries(attempt, delays) {
  for (let i = 0; ; i++) {
    try {
      return await attempt();
    } catch (err) {
      if (!err.transient || i >= delays.length) throw err;
      console.warn(`${err.message}; retrying in ${delays[i] / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, delays[i]));
    }
  }
}
const transient = (message) => Object.assign(new Error(message), { transient: true });

// One query for everything the effects use. Only public repositories are read,
// so private project languages never end up in a public image.
async function fetchProfileLive(login, token) {
  const query = `query($login:String!){user(login:$login){
    login name avatarUrl(size:160) createdAt
    followers{totalCount}
    pullRequests{totalCount} issues{totalCount}
    repositories(ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC,first:100,orderBy:{field:STARGAZERS,direction:DESC}){
      totalCount nodes{name stargazerCount languages(first:8,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}}}
    contributionsCollection{
      totalCommitContributions totalPullRequestContributions totalIssueContributions totalPullRequestReviewContributions
      contributionCalendar{totalContributions weeks{contributionDays{date weekday contributionCount contributionLevel}}}}}}`;
  let res;
  try {
    res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "CustomizeYouProfile" },
      body: JSON.stringify({ query, variables: { login } }),
      signal: AbortSignal.timeout(60e3),
    });
  } catch (err) {
    throw transient(`GitHub API unreachable (${err.name === "TimeoutError" ? "no answer in 60s" : err.cause?.code ?? err.message})`);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    const message = `GitHub API error ${res.status} for "${login}": ${JSON.stringify(json.errors ?? json)}`;
    // a busy GraphQL backend answers 502/504, or 200 with "Something went wrong … timeout"
    const busy = res.status >= 500 || (json.errors ?? []).some((e) => /something went wrong|timeout/i.test(e?.message));
    throw busy ? transient(message) : new Error(message);
  }
  if (!json.data?.user) throw new Error(`GitHub user "${login}" not found`);
  return json.data.user;
}

// Small avatar as a data URI: images inside an SVG shown via <img> can't load external URLs.
export async function fetchAvatar(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20e3) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "image/png").split(";")[0].trim().toLowerCase();
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > AVATAR_MAX_BYTES) return null;
    return safeAvatar(`data:${type};base64,${bytes.toString("base64")}`);
  } catch {
    return null;
  }
}

// Only a plain base64 raster image may go into an SVG attribute; anything else
// (odd content types, SVG, quotes) is dropped and the initial is drawn instead.
export const AVATAR_MAX_BYTES = 512 * 1024;
export const safeAvatar = (uri) =>
  typeof uri === "string" && uri.length < AVATAR_MAX_BYTES * 1.4 && /^data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(uri) ? uri : null;

// Everything an effect gets: calendar, a flat indexed day list with grid coordinates, and profile stats.
export function buildContext(login, user) {
  const calendar = user.contributionsCollection.contributionCalendar;
  const days = [];
  calendar.weeks.forEach((w, col) =>
    w.contributionDays.forEach((d) =>
      days.push({ ...d, col, row: d.weekday, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0 })));
  days.forEach((d, i) => (d.index = i));
  const maxCount = Math.max(0, ...days.map((d) => d.count));

  const langs = new Map();
  for (const repo of user.repositories.nodes)
    for (const { size, node } of repo.languages.edges) {
      const l = langs.get(node.name) ?? { name: node.name, color: node.color || "#8b949e", size: 0, repos: 0 };
      l.size += size; l.repos++;
      langs.set(node.name, l);
    }
  const languages = [...langs.values()].sort((a, b) => b.size - a.size);
  const langTotal = languages.reduce((s, l) => s + l.size, 0) || 1;
  languages.forEach((l) => (l.share = l.size / langTotal));

  let longest = 0, run = 0;
  for (const d of days) { run = d.count ? run + 1 : 0; longest = Math.max(longest, run); }
  const cc = user.contributionsCollection;
  const profile = {
    name: user.name || user.login,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    repos: user.repositories.totalCount,
    stars: user.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
    pullRequests: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    yearCommits: cc.totalCommitContributions,
    yearPullRequests: cc.totalPullRequestContributions,
    yearReviews: cc.totalPullRequestReviewContributions,
    activeDays: days.filter((d) => d.count > 0).length,
    longestStreak: longest,
    languages,
  };
  return { login: user.login || login, calendar, days, weeks: calendar.weeks.length, total: calendar.totalContributions, maxCount, profile };
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
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
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

// GitHub's own colors, for the calm "clean" style that follows the viewer's theme.
export const GH_THEMES = {
  light: {
    name: "light", fg: "#1f2328", muted: "#59636e", subtle: "#f6f8fa", border: "#d0d7de", bg: "#ffffff",
    accent: "#0969da", success: "#1a7f37", ink: "#535353", cloud: "#d8dee4",
    levels: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  },
  dark: {
    name: "dark", fg: "#e6edf3", muted: "#9198a1", subtle: "#151b23", border: "#30363d", bg: "#0d1117",
    accent: "#4493f8", success: "#3fb950", ink: "#c9d1d9", cloud: "#262c36",
    levels: ["#151b23", "#0e4429", "#006d32", "#26a641", "#39d353"],
  },
};
export const SANS = `-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif`;
