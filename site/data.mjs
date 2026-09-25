// Public data for the configurator's preview, fetched straight from the
// browser (no token): GitHub's REST API for the profile and repositories, and
// a public contributions mirror for the calendar (GitHub has no token-free API
// for it). The Action itself uses GitHub's GraphQL API, so numbers in the
// preview can differ slightly (languages come from the byte counts of your
// largest repositories only).

// The calendar mirror. null turns it off: like when it's down or blocked, the
// preview then shows the real profile with a sample contribution year.
export const CALENDAR_API = "https://github-contributions-api.jogruber.de/v4/";

const LEVELS = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

// GitHub linguist colors for common languages.
export const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Java: "#b07219", "C#": "#178600",
  "C++": "#f34b7d", C: "#555555", Go: "#00ADD8", Rust: "#dea584", Ruby: "#701516", PHP: "#4F5D95",
  Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB", HTML: "#e34c26", CSS: "#563d7c", SCSS: "#c6538c",
  Shell: "#89e051", PowerShell: "#012456", Lua: "#000080", Vue: "#41b883", Svelte: "#ff3e00",
  "Jupyter Notebook": "#DA5B0B", R: "#198CE7", Scala: "#c22d40", Haskell: "#5e5086", Elixir: "#6e4a7e",
  "Objective-C": "#438eff", Dockerfile: "#384d54", Makefile: "#427819", TeX: "#3D6117", "Vim Script": "#199f4b",
  Zig: "#ec915c", Nix: "#7e7eff", Clojure: "#db5855", Julia: "#a270ba", Perl: "#0298c3", Assembly: "#6E4C13",
  Solidity: "#AA6746", GDScript: "#355570", HCL: "#844FBA", MDX: "#fcb32c", Astro: "#ff5a03", Batchfile: "#C1F12E",
  CMake: "#DA3434", "F#": "#b845fc", OCaml: "#ef7a08", Erlang: "#B83998", Groovy: "#4298b8", "Visual Basic .NET": "#945db7",
  ShaderLab: "#222c37", HLSL: "#aace60", GLSL: "#5686a5", Mako: "#7e858d", Pascal: "#E3F171", Fortran: "#4d41b1",
};

const edge = (name, size) => ({ size, node: { name, color: LANGUAGE_COLORS[name] ?? "#8b949e" } });
function languageEdges(repo, langBytes) {
  if (langBytes && Object.keys(langBytes).length) {
    const bytes = langBytes[repo.name];
    return bytes ? Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, b]) => edge(n, b)) : [];
  }
  return repo.language ? [edge(repo.language, 1000)] : [];
}

export class LoadError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

async function getJson(url, signal) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: "application/vnd.github+json" }, signal });
  } catch {
    throw new LoadError("network", "network error");
  }
  if (res.status === 404) throw new LoadError("notfound", "not found");
  if (res.status === 403 || res.status === 429) throw new LoadError("ratelimit", "rate limited");
  if (!res.ok) throw new LoadError("http", `HTTP ${res.status}`);
  return res.json();
}

// Pure: the mirror's { total, contributions } → the GraphQL contributionsCollection.
// It's a third-party service, so only well-formed days are kept; none (or no
// response at all) gives an empty calendar.
function toYear(contrib) {
  const days = (Array.isArray(contrib?.contributions) ? contrib.contributions : [])
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d?.date) && !Number.isNaN(Date.parse(d.date)))
    .map((d) => ({ date: d.date, count: Math.max(0, Math.floor(Number(d.count)) || 0), level: Math.min(4, Math.max(0, Math.floor(Number(d.level)) || 0)) }));
  const weeks = [];
  for (const d of days) {
    const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (!weeks.length || weekday === 0) weeks.push({ contributionDays: [] });
    weeks.at(-1).contributionDays.push({ date: d.date, weekday, contributionCount: d.count, contributionLevel: LEVELS[d.level] ?? "NONE" });
  }
  const total = days.reduce((s, d) => s + d.count, 0);
  const reported = Number(contrib?.total?.lastYear);
  return {
    totalCommitContributions: total,
    totalPullRequestContributions: 0,
    totalIssueContributions: 0,
    totalPullRequestReviewContributions: 0,
    contributionCalendar: { totalContributions: Number.isFinite(reported) && reported >= 0 ? reported : total, weeks },
  };
}
const hasDays = (year) => year.contributionCalendar.weeks.length > 0;

// Pure: REST + contributions responses → the GraphQL user shape buildContext() expects.
// langBytes: { repoName: { Language: bytes } } for the biggest repos. Those dominate the
// byte totals the Action computes, so they give the same top language. Without it
// (rate limited) each repo counts once for its main language.
export function toUser(rest, repos, contrib = null, pullRequests = 0, langBytes = null) {
  const own = repos.filter((r) => !r.fork);
  return {
    login: rest.login,
    name: rest.name,
    avatarUrl: rest.avatar_url,
    createdAt: rest.created_at,
    followers: { totalCount: rest.followers ?? 0 },
    pullRequests: { totalCount: pullRequests },
    issues: { totalCount: 0 },
    repositories: {
      totalCount: repos.length < 100 ? own.length : rest.public_repos,
      nodes: own.map((r) => ({
        name: r.name,
        stargazerCount: r.stargazers_count ?? 0,
        languages: { edges: languageEdges(r, langBytes) },
      })),
    },
    contributionsCollection: toYear(contrib),
  };
}

// The mirror's raw answer, or null when it's turned off, blocked, down, too slow or not JSON.
const fetchCalendar = (login) => CALENDAR_API
  ? getJson(`${CALENDAR_API}${encodeURIComponent(login)}?y=last`, AbortSignal.timeout?.(8000)).catch(() => null)
  : Promise.resolve(null);

// Lookups are kept for an hour (the last 5 users), so reloading or coming back
// doesn't spend the 60 requests/hour GitHub allows without login (a lookup
// costs about a dozen).
const CACHE = "cyp:users3", HOUR = 60 * 60e3;
function cached(login) {
  try {
    const hit = JSON.parse(localStorage.getItem(CACHE) ?? "{}")[login.toLowerCase()];
    return hit && Date.now() - hit.at < HOUR ? hit.data : null;
  } catch { return null; }
}
function remember(login, data) {
  try {
    const all = { ...JSON.parse(localStorage.getItem(CACHE) ?? "{}"), [login.toLowerCase()]: { at: Date.now(), data } };
    const keep = Object.entries(all).filter(([, v]) => Date.now() - v?.at < HOUR).sort((a, b) => b[1].at - a[1].at).slice(0, 5);
    localStorage.setItem(CACHE, JSON.stringify(Object.fromEntries(keep)));
  } catch {}
  return data;
}

// → { user, repo, calendar }. calendar is "live", or "sample" when the mirror
// gave nothing usable: the user's calendar is then empty, and the page draws a
// sample year into it (with src/demo.mjs; this file has no imports so the tests
// can load it straight from the repo).
export async function fetchPublicProfile(login) {
  const hit = cached(login);
  if (hit?.calendar === "sample") {                  // GitHub's part is still fresh: just retry the calendar
    const year = toYear(await fetchCalendar(hit.user.login));
    if (hasDays(year)) return remember(login, { ...hit, user: { ...hit.user, contributionsCollection: year }, calendar: "live" });
  }
  if (hit) return hit;
  const enc = encodeURIComponent(login);
  const rest = await getJson(`https://api.github.com/users/${enc}`);
  const [repos, contrib, prs, profileRepo] = await Promise.all([
    getJson(`https://api.github.com/users/${enc}/repos?per_page=100&type=owner&sort=pushed`),
    fetchCalendar(rest.login),
    getJson(`https://api.github.com/search/issues?q=${encodeURIComponent(`author:${rest.login} type:pr`)}&per_page=1`).then((r) => r.total_count).catch(() => 0),
    getJson(`https://api.github.com/repos/${rest.login}/${rest.login}`).catch(() => null),
  ]);
  // exact language bytes for the 6 largest repositories (skipped quietly if rate limited)
  const biggest = repos.filter((r) => !r.fork && r.size > 0).sort((a, b) => b.size - a.size).slice(0, 6);
  const langBytes = Object.fromEntries((await Promise.all(biggest.map((r) =>
    getJson(`https://api.github.com/repos/${r.full_name}/languages`).then((l) => [r.name, l], () => null)))).filter(Boolean));
  let hasWorkflow = false;
  if (profileRepo) {
    hasWorkflow = await getJson(`https://api.github.com/repos/${rest.login}/${rest.login}/contents/.github/workflows/profile-effects.yml`).then(() => true, () => false);
  }
  const user = toUser(rest, repos, contrib, prs, langBytes);
  return remember(login, {
    user,
    repo: profileRepo ? { exists: true, branch: profileRepo.default_branch || "main", hasWorkflow } : { exists: false, branch: "main", hasWorkflow: false },
    calendar: hasDays(user.contributionsCollection) ? "live" : "sample",
  });
}

// Avatar as a data URI: images inside an SVG shown via <img> can't load URLs.
export async function fetchAvatarDataUri(url) {
  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}s=160`);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > 512 * 1024) return null;                 // app.mjs also checks it with safeAvatar()
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
