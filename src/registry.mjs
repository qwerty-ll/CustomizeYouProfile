// The effect catalog, shared by the CLI (Action) and the web configurator.
// Order here is the order used for `all`.

export const EFFECTS = {
  "intro": { group: "you", title: "Intro", blurb: "Your name and lines about you, typed one by one", alt: "Animated intro banner" },
  "skills": { group: "you", title: "Tech stack", blurb: "Your stack as two gliding rows of pills", alt: "Tech stack" },
  "rpg-card": { group: "you", title: "RPG card", blurb: "Level, stats, class and achievements", alt: "GitHub stats as an RPG character card", avatar: true },
  "languages": { group: "you", title: "Languages", blurb: "Top languages as a bouncing equalizer", alt: "Top languages as an animated equalizer" },
  "dino-run": { group: "year", title: "Dino run", blurb: "Chrome's T-rex jumps over your busiest days", alt: "A dino running through the year, jumping over commit-cacti" },
  "fireworks": { group: "year", title: "Fireworks", blurb: "A rocket per month, then your graph in sparks", alt: "Fireworks for every month that end by drawing the contribution graph in the sky" },
  "black-hole": { group: "year", title: "Black hole", blurb: "Your graph spirals in, then a big bang", alt: "A black hole swallows the contribution graph and a big bang rebuilds it" },
  "oscilloscope": { group: "year", title: "Oscilloscope", blurb: "A CRT trace of your daily commits", alt: "CRT oscilloscope tracing daily commits" },
  "terminal": { group: "year", title: "Terminal", blurb: "git log --stats typed out with your numbers", alt: "Terminal typing git log --stats" },
  "notebook": { group: "year", title: "Notebook", blurb: "A pencil shades your year into squared paper", alt: "Squared school notebook shaded in pencil" },
  "space-shooter": { group: "year", title: "Space shooter", blurb: "A ship shoots down commits, biggest first", alt: "A spaceship shooting down contributions, biggest first" },
  "countdown": { group: "personal", title: "Countdown", blurb: "Flip-clock days until your dates", alt: "Countdown to upcoming dates" },
};

// Effects that no longer exist: skipped with a warning (so old workflows keep
// working) and their leftover files are removed.
export const REMOVED = ["solar-system"];

// "all" / "intro, dino-run" → the ids to render, in order, plus any warnings.
// Setting a countdown is enough to show it, so the card is added after the intro.
export function resolveEffects(input, modes) {
  const warnings = [];
  const requested = input.trim().toLowerCase() === "all"
    ? Object.keys(EFFECTS).filter((id) => id !== "countdown")
    : input.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (modes.countdowns.length && !requested.includes("countdown"))
    requested.splice(requested[0] === "intro" ? 1 : 0, 0, "countdown");
  const removed = requested.filter((id) => REMOVED.includes(id));
  if (removed.length) warnings.push(`${removed.join(", ")} was removed from the library and is skipped; remove it from your workflow.`);
  const unknown = requested.filter((id) => !EFFECTS[id] && !REMOVED.includes(id));
  if (unknown.length) throw new Error(`unknown effect(s): ${unknown.join(", ")}. Available: ${Object.keys(EFFECTS).join(", ")}`);
  if (requested.includes("countdown") && !modes.countdowns.length)
    warnings.push("countdown is listed but the countdown input is empty, so it is skipped.");
  const selected = [...new Set(requested)].filter((id) => EFFECTS[id] && !(id === "countdown" && !modes.countdowns.length));
  if (!selected.length) throw new Error("no effects selected");
  return { selected, warnings };
}
