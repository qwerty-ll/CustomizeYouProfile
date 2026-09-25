// Synthetic profiles: the web configurator's preview before a username is
// entered, and the test suite's fixtures. Same shape as the GraphQL response.

import { rng } from "./lib.mjs";

const LEVEL_NAMES = ["NONE", "FIRST_QUARTILE", "SECOND_QUARTILE", "THIRD_QUARTILE", "FOURTH_QUARTILE"];

export function demoUser({ login, activity, peak, langs = 5, name = "Test User", seed = 1 }) {
  const random = rng(seed);
  // 53 weeks ending this week, starting on a Sunday like GitHub's calendar
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - now.getUTCDay() - 52 * 7));
  const weeks = [];
  let total = 0;
  for (let w = 0; w < 53; w++) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start.getTime() + (w * 7 + d) * 864e5);
      if (date > now) break;                       // the calendar ends today
      const count = random() < activity ? Math.ceil(random() ** 3 * peak) : 0;
      total += count;
      days.push({ date: date.toISOString().slice(0, 10), weekday: d, contributionCount: count, contributionLevel: LEVEL_NAMES[count === 0 ? 0 : Math.min(4, 1 + Math.floor((count / peak) * 4))] });
    }
    weeks.push({ contributionDays: days });
  }
  const palette = ["#f1e05a", "#3178c6", "#3572A5", "#e34c26", "#563d7c", "#178600", "#00ADD8", "#dea584", "#b07219"];
  const names = ["JavaScript", "TypeScript", "Python", "HTML", "CSS", "C#", "Go", "Rust", "Java"];
  return {
    login, name, avatarUrl: "https://example.invalid/a.png", createdAt: "2019-01-01T00:00:00Z",
    followers: { totalCount: Math.round(peak * 3) }, pullRequests: { totalCount: Math.round(peak * 5) }, issues: { totalCount: 4 },
    repositories: { totalCount: langs * 3, nodes: Array.from({ length: langs * 3 }, (_, i) => ({
      name: `repo${i}`, stargazerCount: i * 2,
      languages: { edges: [{ size: Math.round(100000 / (i + 1)), node: { name: names[i % langs], color: palette[i % langs] } }] },
    })) },
    contributionsCollection: {
      totalCommitContributions: total, totalPullRequestContributions: 3, totalIssueContributions: 1, totalPullRequestReviewContributions: 0,
      contributionCalendar: { totalContributions: total, weeks },
    },
  };
}
