// Opt-in seasonal and personal modes. Nothing here is on unless the user asks
// for it (seasons / birthday / countdown inputs); dates are compared in UTC
// against the day the action runs.

import { clip } from "./lib.mjs";

export const SEASONS = {
  "new-year": { from: [12, 15], to: [1, 10] },
  "halloween": { from: [10, 24], to: [11, 1] },
};

const pad = (n) => String(n).padStart(2, "0");
const md = (d) => [d.getUTCMonth() + 1, d.getUTCDate()];
const dayNumber = (d) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 864e5);

// A real calendar day, or null: no rolling 02-30 over into March, and no two-digit
// years (Date.UTC reads 0099 as 1999).
export function utcDate(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? d : null;
}
// The birthday in a given year; Feb 29 is celebrated on Feb 28 in other years.
export const birthdayIn = (year, { month, day }) =>
  utcDate(year, month, day) ?? (month === 2 && day === 29 ? utcDate(year, 2, 28) : null);

function inWindow(today, { from, to }) {
  const [m, d] = md(today), v = m * 100 + d, a = from[0] * 100 + from[1], b = to[0] * 100 + to[1];
  return a <= b ? v >= a && v <= b : v >= a || v <= b;       // windows may wrap over New Year
}

export function parseSeasons(input = "") {
  const v = input.trim().toLowerCase();
  if (!v || v === "none" || v === "false" || v === "off") return [];
  if (v === "all" || v === "true" || v === "on") return Object.keys(SEASONS);
  const list = v.split(/[\s,]+/).filter(Boolean);
  const bad = list.filter((s) => !SEASONS[s]);
  if (bad.length) throw new Error(`unknown season(s): ${bad.join(", ")}. Available: ${Object.keys(SEASONS).join(", ")}, all`);
  return list;
}

// "03-15", "15.03", "2001-03-15" → { month: 3, day: 15 }
export function parseBirthday(input = "") {
  const v = input.trim();
  if (!v) return null;
  let m = v.match(/^(?:\d{4}-)?(\d{1,2})-(\d{1,2})$/), month, day;
  if (m) [month, day] = [+m[1], +m[2]];
  else if ((m = v.match(/^(\d{1,2})\.(\d{1,2})(?:\.\d{4})?$/))) [day, month] = [+m[1], +m[2]];
  if (!month || !utcDate(2000, month, day)) throw new Error(`birthday "${v}" should be a real date like MM-DD (e.g. 03-15)`);
  return { month, day };
}

// "2026-12-31 Release; 2027-06-01 Vacation; birthday" → [{ date, label }]
export function parseCountdowns(input = "", birthday = null) {
  const out = [];
  for (const raw of input.split(/[;\n]/).map((s) => s.trim()).filter(Boolean)) {
    if (/^birthday$/i.test(raw) || /^др$/i.test(raw)) {
      if (!birthday) throw new Error(`countdown "birthday" needs the birthday input too`);
      out.push({ birthday: true, label: null });
      continue;
    }
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s*[|:\-–]?\s*(.*)$/);
    if (!m) throw new Error(`countdown "${raw}" should look like "YYYY-MM-DD Label"`);
    const date = utcDate(+m[1], +m[2], +m[3]);
    if (!date) throw new Error(`countdown "${raw}" has a date that doesn't exist`);
    out.push({ date, label: clip(m[4].trim(), 40) || null });
  }
  if (out.length > 3) throw new Error("up to 3 countdowns are supported");
  return out;
}

const TEXT = {
  en: {
    birthdayLabel: "my birthday", untilLabel: "the big day",
    days: (n) => `${n} day${n === 1 ? "" : "s"}`,
    until: (n, label) => `${n} day${n === 1 ? "" : "s"} until ${label}`,
    today: (label) => `${label}: today!`,
    ago: (n, label) => `${label} was ${n} day${n === 1 ? "" : "s"} ago`,
    birthdayLine: "🎂 it's my birthday today!",
    happyBirthday: "HAPPY BIRTHDAY", happyNewYear: "HAPPY NEW YEAR", happyHalloween: "HAPPY HALLOWEEN",
  },
  ru: {
    birthdayLabel: "мой день рождения", untilLabel: "важный день",
    days: (n) => `${n} ${ruDays(n)}`,
    until: (n, label) => `${label}: через ${n} ${ruDays(n)}`,
    today: (label) => `${label} — сегодня!`,
    ago: (n, label) => `${label}: ${n} ${ruDays(n)} назад`,
    birthdayLine: "🎂 сегодня мой день рождения!",
    happyBirthday: "С ДНЁМ РОЖДЕНИЯ", happyNewYear: "С НОВЫМ ГОДОМ", happyHalloween: "HAPPY HALLOWEEN",
  },
};
function ruDays(n) {
  const a = Math.abs(n) % 10, b = Math.abs(n) % 100;
  return a === 1 && b !== 11 ? "день" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "дня" : "дней";
}

// Everything effects need to know about today's modes.
export function resolveModes({ today = new Date(), seasons = [], birthday = null, countdowns = [], language = "en" }) {
  const t = TEXT[language] ?? TEXT.en;
  const isBirthday = !!birthday && dayNumber(birthdayIn(today.getUTCFullYear(), birthday)) === dayNumber(today);
  const cds = countdowns.map((c) => {
    let date = c.date, label = c.label;
    if (c.birthday) {
      date = birthdayIn(today.getUTCFullYear(), birthday);
      if (dayNumber(date) < dayNumber(today)) date = birthdayIn(today.getUTCFullYear() + 1, birthday);
      label = label ?? t.birthdayLabel;
    }
    label = label ?? t.untilLabel;
    const days = dayNumber(date) - dayNumber(today);
    const text = days > 0 ? t.until(days, label) : days === 0 ? t.today(label) : t.ago(-days, label);
    return { date, label, days, text, iso: `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` };
  });
  const active = (s) => seasons.includes(s) && inWindow(today, SEASONS[s]);
  const newYear = active("new-year");
  const nyYear = today.getUTCMonth() === 11 ? today.getUTCFullYear() + 1 : today.getUTCFullYear();
  return {
    today, language, text: t,
    newYear, nyYear,
    halloween: active("halloween"),
    birthday: isBirthday,
    countdowns: cds,
    get any() { return this.newYear || this.halloween || this.birthday; },
  };
}
