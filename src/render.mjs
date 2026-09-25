// Renders one effect exactly the way the Action does (same seeds, same
// seasonal overlays), and builds the README markup for a set of results.
// Pure: runs in Node and in the browser.

import { decorate } from "./decorate.mjs";
import { seedFor } from "./lib.mjs";
import { EFFECTS } from "./registry.mjs";

export async function renderEffect(id, ctx, options) {
  const { default: render } = await import(`./effects/${id}.mjs`);
  const files = await render(ctx, options);
  for (const f of files) f.svg = decorate(f.svg, options.modes, seedFor(ctx.login, f.file.length * 7919));
  return files;
}

// Light/dark pairs become a <picture> that follows the viewer's GitHub theme.
export function readmeBlock(produced, base) {
  return produced.map(({ id, files }) => {
    const { alt } = EFFECTS[id];
    const light = files.find((f) => !f.endsWith("-dark.svg"));
    const dark = files.find((f) => f.endsWith("-dark.svg"));
    return dark
      ? `<picture>\n  <source media="(prefers-color-scheme: dark)" srcset="${base}/${dark}">\n  <img alt="${alt}" src="${base}/${light}" width="100%">\n</picture>`
      : `<img alt="${alt}" src="${base}/${light}" width="100%">`;
  }).join("\n\n");
}
