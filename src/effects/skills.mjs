// `style: clean` (default) follows the viewer's GitHub theme; `style: neon` is the original look.
import clean from "../styles/clean/skills.mjs";
import neon from "../styles/neon/skills.mjs";

export default (ctx, options = {}) => (options.style === "neon" ? neon : clean)(ctx, options);
