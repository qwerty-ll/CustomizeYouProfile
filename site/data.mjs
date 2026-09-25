// Public data for the configurator's preview, fetched straight from the
// browser (no token): GitHub's REST API for the profile and repositories, and
// a public contributions mirror for the calendar. The Action itself uses
// GitHub's GraphQL API, so numbers in the preview can differ slightly
// (e.g. languages are weighted by repo size instead of bytes of code).

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

export class LoadError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

async function getJson(url) {
  let res;
  try {
    res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  } catch {
    throw new LoadError("network", "network error");
  }
  if (res.status === 404) throw new LoadError("notfound", "not found");
  if (res.status === 403 || res.status === 429) throw new LoadError("ratelimit", "rate limited");
  if (!res.ok) throw new LoadError("http", `HTTP ${res.status}`);
  return res.json();
}

// Pure: REST + contributions responses → the GraphQL user shape buildContext() expects.
export function toUser(rest, repos, contrib, pullRequests = 0) {
  const own = repos.filter((r) => !r.fork);
  const weeks = [];
  for (const d of contrib.contributions) {
    const weekday = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if (!weeks.length || weekday === 0) weeks.push({ contributionDays: [] });
    weeks.at(-1).contributionDays.push({ date: d.date, weekday, contributionCount: d.count, contributionLevel: LEVELS[d.level] ?? "NONE" });
  }
  const total = contrib.contributions.reduce((s, d) => s + d.count, 0);
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
        languages: { edges: r.language ? [{ size: Math.max(1, r.size ?? 1) * 1024, node: { name: r.language, color: LANGUAGE_COLORS[r.language] ?? "#8b949e" } }] : [] },
      })),
    },
    contributionsCollection: {
      totalCommitContributions: total,
      totalPullRequestContributions: 0,
      totalIssueContributions: 0,
      totalPullRequestReviewContributions: 0,
      contributionCalendar: { totalContributions: contrib.total?.lastYear ?? total, weeks },
    },
  };
}

// Cached per session so tweaking options doesn't spend the 60 requests/hour
// GitHub allows without login.
export async function fetchPublicProfile(login) {
  const key = `cyp:user:${login.toLowerCase()}`;
  try {
    const hit = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (hit && Date.now() - hit.at < 15 * 60e3) return hit.data;
  } catch {}
  const enc = encodeURIComponent(login);
  const rest = await getJson(`https://api.github.com/users/${enc}`);
  const [repos, contrib, prs, profileRepo] = await Promise.all([
    getJson(`https://api.github.com/users/${enc}/repos?per_page=100&type=owner&sort=pushed`),
    getJson(`https://github-contributions-api.jogruber.de/v4/${enc}?y=last`).catch(() => {
      throw new LoadError("contrib", "contributions unavailable");
    }),
    getJson(`https://api.github.com/search/issues?q=${encodeURIComponent(`author:${rest.login} type:pr`)}&per_page=1`).then((r) => r.total_count).catch(() => 0),
    getJson(`https://api.github.com/repos/${rest.login}/${rest.login}`).catch(() => null),
  ]);
  let hasWorkflow = false;
  if (profileRepo) {
    hasWorkflow = await getJson(`https://api.github.com/repos/${rest.login}/${rest.login}/contents/.github/workflows/profile-effects.yml`).then(() => true, () => false);
  }
  const data = {
    user: toUser(rest, repos, contrib, prs),
    repo: profileRepo ? { exists: true, branch: profileRepo.default_branch || "main", hasWorkflow } : { exists: false, branch: "main", hasWorkflow: false },
  };
  try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data })); } catch {}
  return data;
}

// Avatar as a data URI: images inside an SVG shown via <img> can't load URLs.
export async function fetchAvatarDataUri(url) {
  try {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}s=160`);
    if (!res.ok) return null;
    const blob = await res.blob();
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
