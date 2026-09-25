// What the configurator hands back: the workflow file, the one-line installer
// command and deep links into GitHub. Only non-default settings are written,
// so the result stays short and readable.

export const ACTION = "qwerty-ll/CustomizeYouProfile@v1";
export const WORKFLOW_PATH = ".github/workflows/profile-effects.yml";
export const INSTALL_URL = "https://raw.githubusercontent.com/qwerty-ll/CustomizeYouProfile/main/install.sh";

// Values end up inside a workflow: line breaks would break the YAML, and GitHub
// evaluates ${{ … }} in `with:` values (so "${{ github.token }}" in a tagline would
// print the token into a public image). Both are neutralized.
export const clean = (s) => String(s).replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, " ").replace(/\$\{\{/g, "$ {{");
const yq = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const sq = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;

// cfg: { effects[], style, language, name, tagline, skills, seasons[], birthday, countdown, position }
export function inputs(cfg) {
  const out = [["effects", cfg.effects.join(", ")]];
  const add = (k, v) => out.push([k, clean(v)]);
  if (cfg.style === "neon") out.push(["style", "neon"]);
  if (cfg.language === "ru") out.push(["language", "ru"]);
  if (cfg.name) add("name", cfg.name);
  if (cfg.tagline) add("tagline", cfg.tagline);
  if (cfg.skills) add("skills", cfg.skills);
  if (cfg.seasons?.length) out.push(["seasons", cfg.seasons.join(", ")]);
  if (cfg.birthday) add("birthday", cfg.birthday);
  if (cfg.countdown) add("countdown", cfg.countdown);
  if (cfg.position === "bottom") out.push(["readme-position", "bottom"]);
  return out;
}

export function workflowYaml(cfg) {
  const withLines = inputs(cfg).map(([k, v]) => `          ${k}: ${k === "effects" ? v : yq(v)}`).join("\n");
  return `name: Profile effects

on:
  schedule:
    - cron: "0 3 * * *"   # every day
  workflow_dispatch:
  push:                   # also run right after this file is added or edited
    paths: [${yq(WORKFLOW_PATH)}]

permissions:
  contents: write

concurrency:
  group: profile-effects

jobs:
  effects:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ${ACTION}
        with:
${withLines}
`;
}

const ENV = { style: "CYP_STYLE", language: "CYP_LANGUAGE", name: "CYP_NAME", tagline: "CYP_TAGLINE", skills: "CYP_SKILLS", seasons: "CYP_SEASONS", birthday: "CYP_BIRTHDAY", countdown: "CYP_COUNTDOWN", "readme-position": "CYP_README_POSITION" };

export function installCommand(cfg) {
  const env = inputs(cfg).filter(([k]) => k !== "effects").map(([k, v]) => `${ENV[k]}=${sq(v)}`);
  const cmd = `bash <(curl -fsSL ${INSTALL_URL}) ${cfg.effects.join(",")}`;
  return env.length ? `${env.join(" ")} \\\n  ${cmd}` : cmd;
}

export const newRepoUrl = (login) =>
  `https://github.com/new?name=${encodeURIComponent(login)}&visibility=public&description=${encodeURIComponent("My GitHub profile")}`;
export const newWorkflowUrl = (login, branch, yaml) =>
  `https://github.com/${login}/${login}/new/${encodeURIComponent(branch)}?filename=${encodeURIComponent(WORKFLOW_PATH)}&value=${encodeURIComponent(yaml)}`;
export const editWorkflowUrl = (login, branch) => `https://github.com/${login}/${login}/edit/${encodeURIComponent(branch)}/${WORKFLOW_PATH}`;
export const actionsUrl = (login) => `https://github.com/${login}/${login}/actions/workflows/profile-effects.yml`;
