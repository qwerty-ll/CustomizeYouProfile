// Keeps the generated images in their own marked block, so the rest of a
// profile README is never touched.

export const START = "<!-- customize-you-profile:start -->";
export const END = "<!-- customize-you-profile:end -->";

export function updateReadme(current, block, position = "top") {
  const section = `${START}\n${block}\n${END}`;
  if (current === null || current.trim() === "") return `${section}\n`;
  const s = current.indexOf(START), e = current.indexOf(END);
  if (s !== -1 && e > s) return current.slice(0, s) + section + current.slice(e + END.length);
  return position === "bottom"
    ? `${current.replace(/\s*$/, "")}\n\n${section}\n`
    : `${section}\n\n${current}`;
}
