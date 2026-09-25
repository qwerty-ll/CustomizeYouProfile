// Turns raw inputs (strings from action.yml, the CLI or the web configurator)
// into render options and today's modes. Throws Error with a readable message.

import { parseBirthday, parseCountdowns, parseSeasons, resolveModes, utcDate } from "./seasonal.mjs";

export function resolveSettings({
  style = "clean", language = "en", name = "", tagline = "", skills = "",
  seasons = "", birthday = "", countdown = "", today = "",
} = {}) {
  const lang = String(language).toLowerCase().startsWith("ru") ? "ru" : "en";
  const st = String(style).trim().toLowerCase() || "clean";
  if (!["clean", "neon"].includes(st)) throw new Error(`style "${style}" should be clean or neon`);
  const bday = parseBirthday(birthday);
  const ymd = String(today).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const day = ymd && utcDate(+ymd[1], +ymd[2], +ymd[3]);
  if (today && !day) throw new Error(`today "${today}" should be a real date like 2026-12-31`);
  const now = day ? new Date(day.getTime() + 12 * 3600e3) : new Date();
  const modes = resolveModes({
    today: now, birthday: bday, language: lang,
    seasons: parseSeasons(Array.isArray(seasons) ? seasons.join(",") : seasons),
    countdowns: parseCountdowns(countdown, bday),
  });
  return {
    modes,
    options: {
      style: st,
      language: lang,
      name: String(name).trim(),
      tagline: String(tagline).split("|").map((s) => s.trim()).filter(Boolean),
      skills: String(skills).split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
      modes,
    },
  };
}
