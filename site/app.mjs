// The configurator: pick effects and options, preview them on your own public
// data with the exact code the Action runs, then copy a ready-made setup.

import { demoUser } from "./src/demo.mjs";
import { buildContext, safeAvatar, seedFor } from "./src/lib.mjs";
import { EFFECTS, resolveEffects } from "./src/registry.mjs";
import { renderEffect } from "./src/render.mjs";
import { resolveSettings } from "./src/settings.mjs";
import { CALENDAR_API, LoadError, fetchAvatarDataUri, fetchPublicProfile } from "./data.mjs";
import { EFFECT_TEXT_RU, MONTHS, STRINGS } from "./i18n.mjs";
import { actionsUrl, editWorkflowUrl, installCommand, newRepoUrl, newWorkflowUrl, workflowYaml } from "./output.mjs";

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const store = {
  get(k, d) { try { const v = localStorage.getItem(`cyp:${k}`); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`cyp:${k}`, JSON.stringify(v)); } catch {} },
};

// ---------- state ----------
const DEFAULT = {
  effects: ["intro", "skills", "rpg-card", "dino-run"], style: "clean", language: "en",
  name: "", tagline: "", skills: "", seasons: [], bMonth: "", bDay: "",
  countdowns: [], toBirthday: false, position: "top",
};
const state = {
  cfg: { ...DEFAULT, ...store.get("cfg", {}) },
  ui: store.get("ui", navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en"),
  theme: store.get("theme", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  pretend: "today",
  tab: "browser",
  login: "",
  status: { kind: "demo" },           // demo | loading | loaded | error
  ctx: null, avatar: null, repo: null,
};
const t = (k, ...a) => { const v = STRINGS[state.ui][k] ?? STRINGS.en[k]; return typeof v === "function" ? v(...a) : v; };
const effectTitle = (id) => (state.ui === "ru" ? EFFECT_TEXT_RU[id]?.[0] : null) ?? EFFECTS[id].title;
const effectBlurb = (id) => (state.ui === "ru" ? EFFECT_TEXT_RU[id]?.[1] : null) ?? EFFECTS[id].blurb;
const DEMO_CTX = buildContext("demo", demoUser({ login: "demo", activity: 0.35, peak: 24, langs: 6, name: "Demo User", seed: 7 }));
// Stands in for the contribution calendar when its mirror can't be used: made up, but the same for a login every time.
const sampleYear = (login) => demoUser({ login, activity: 0.35, peak: 12, seed: seedFor(login, 365) }).contributionsCollection;

function save() { store.set("cfg", state.cfg); store.set("ui", state.ui); store.set("theme", state.theme); }

// ---------- derived settings ----------
const pad2 = (n) => String(n).padStart(2, "0");
const birthdayValue = () => (state.cfg.bMonth && state.cfg.bDay ? `${pad2(state.cfg.bMonth)}-${pad2(state.cfg.bDay)}` : "");
function countdownValue() {
  const parts = state.cfg.countdowns.filter((c) => c.date).map((c) => `${c.date}${c.label.trim() ? ` ${c.label.trim().replace(/;/g, ",")}` : ""}`);
  if (state.cfg.toBirthday && birthdayValue()) parts.push("birthday");
  return parts.join("; ");
}
function configForOutput() {
  const order = Object.keys(EFFECTS).filter((id) => state.cfg.effects.includes(id));
  return {
    effects: order, style: state.cfg.style, language: state.cfg.language,
    name: state.cfg.name.trim(),
    tagline: state.cfg.tagline.split("\n").map((s) => s.trim()).filter(Boolean).join("|"),
    skills: state.cfg.skills.trim(),
    seasons: state.cfg.seasons, birthday: birthdayValue(), countdown: countdownValue(), position: state.cfg.position,
  };
}
function pretendDate() {
  const y = new Date().getUTCFullYear();
  if (state.pretend === "new-year") return `${y}-12-31`;
  if (state.pretend === "halloween") return `${y}-10-31`;
  if (state.pretend === "birthday" && birthdayValue()) return `${y}-${birthdayValue()}`;
  return "";
}

// ---------- layout ----------
function renderShell() {
  document.documentElement.lang = state.ui;
  document.documentElement.dataset.theme = state.theme;
  $("#app").innerHTML = `
  <header class="top">
    <a class="brand" href="./"><span class="logo" aria-hidden="true"></span>CustomizeYouProfile</a>
    <nav>
      <a href="https://github.com/qwerty-ll/CustomizeYouProfile#readme" target="_blank" rel="noopener">${t("readme")}</a>
      <a href="https://github.com/qwerty-ll/CustomizeYouProfile" target="_blank" rel="noopener">${t("source")}</a>
      ${state.ui === "ru" ? `<button class="chip" id="ui-lang" type="button" lang="en" aria-label="English (EN)">EN</button>` : `<button class="chip" id="ui-lang" type="button" lang="ru" aria-label="Русский (RU)">RU</button>`}
    </nav>
  </header>
  <section class="hero">
    <h1>${t("title")}</h1>
    <p>${t("subtitle")}</p>
  </section>
  <main class="layout">
    <div class="controls">
      <section class="card">
        <h2><span class="num">1</span><label for="login">${t("s1")}</label></h2>
        <form id="login-form" class="login">
          <label class="prefix" for="login">github.com/</label>
          <input id="login" name="login" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="octocat" value="${esc(state.login)}" maxlength="39">
          <button class="btn primary" type="submit">${t("load")}</button>
        </form>
        <div id="status" class="status" aria-live="polite"></div>
      </section>

      <section class="card">
        <h2><span class="num">2</span>${t("s2")}
          <span class="spacer"></span>
          <button type="button" class="link" data-all="1">${t("all")}</button><button type="button" class="link" data-all="0">${t("none")}</button>
        </h2>
        ${["you", "year"].map((g) => `
          <h3>${t(g === "you" ? "groupYou" : "groupYear")}</h3>
          <div class="tiles">${Object.keys(EFFECTS).filter((id) => EFFECTS[id].group === g).map((id) => `
            <label class="tile">
              <input type="checkbox" name="effect" value="${id}" ${state.cfg.effects.includes(id) ? "checked" : ""}>
              <span class="tile-body"><b>${esc(effectTitle(id))}</b><small>${esc(effectBlurb(id))}</small></span>
            </label>`).join("")}
          </div>`).join("")}
      </section>

      <section class="card">
        <h2><span class="num">3</span>${t("s3")}</h2>
        <div class="field">
          <span class="label">${t("style")}</span>
          <div class="segmented" role="radiogroup">
            ${["clean", "neon"].map((s) => `<label><input type="radio" name="style" value="${s}" ${state.cfg.style === s ? "checked" : ""}><span><b>${t(s)}</b><small>${t(s + "Hint")}</small></span></label>`).join("")}
          </div>
          <small class="hint">${t("styleNote")}</small>
        </div>
        <div class="field">
          <span class="label">${t("textLang")}</span>
          <div class="segmented compact" role="radiogroup">
            ${[["en", "English"], ["ru", "Русский"]].map(([v, l]) => `<label><input type="radio" name="language" value="${v}" ${state.cfg.language === v ? "checked" : ""}><span><b>${l}</b></span></label>`).join("")}
          </div>
        </div>
        <div class="grid2">
          <label class="field"><span class="label">${t("name")} <em>intro</em></span><input name="name" value="${esc(state.cfg.name)}" placeholder="${esc(t("namePh"))}" maxlength="40"></label>
          <label class="field"><span class="label">${t("skills")} <em>tech stack</em></span><input name="skills" value="${esc(state.cfg.skills)}" placeholder="${esc(t("skillsPh"))}"><small class="hint">${t("skillsHint")}</small></label>
        </div>
        <label class="field"><span class="label">${t("tagline")}</span><textarea name="tagline" rows="3" placeholder="${esc(t("taglinePh"))}">${esc(state.cfg.tagline)}</textarea></label>
        <div class="field">
          <span class="label">${t("position")}</span>
          <div class="segmented compact" role="radiogroup">
            ${["top", "bottom"].map((p) => `<label><input type="radio" name="position" value="${p}" ${state.cfg.position === p ? "checked" : ""}><span><b>${t(p)}</b></span></label>`).join("")}
          </div>
        </div>
      </section>

      <section class="card">
        <h2><span class="num">4</span>${t("s4")} <em class="opt">${t("optional")}</em></h2>
        <p class="hint">${t("modesNote")}</p>
        <div class="tiles two">
          ${[["new-year", "newYear"], ["halloween", "halloween"]].map(([v, k]) => `
            <label class="tile"><input type="checkbox" name="season" value="${v}" ${state.cfg.seasons.includes(v) ? "checked" : ""}>
              <span class="tile-body"><b>${t(k)}</b><small>${t(k + "Hint")}</small></span></label>`).join("")}
        </div>
        <div class="field">
          <span class="label">${t("birthday")}</span>
          <div class="row">
            <select name="bMonth" aria-label="${t("month")}"><option value="">${t("month")}</option>${MONTHS[state.ui].map((m, i) => `<option value="${i + 1}" ${+state.cfg.bMonth === i + 1 ? "selected" : ""}>${m}</option>`).join("")}</select>
            <select name="bDay" aria-label="${t("day")}"><option value="">${t("day")}</option>${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}" ${+state.cfg.bDay === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select>
          </div>
          <small class="hint">${t("birthdayHint")}</small>
        </div>
        <div class="field">
          <span class="label">${t("countdown")}</span>
          <div id="countdowns"></div>
          <small class="hint">${t("countdownHint")}</small>
        </div>
      </section>

      <section class="card">
        <h2><span class="num">5</span>${t("s5")}</h2>
        <div class="tabs" role="tablist">
          ${[["browser", "tabBrowser"], ["command", "tabCommand"], ["file", "tabFile"]].map(([v, k]) => `<button type="button" role="tab" data-tab="${v}" aria-selected="${state.tab === v}">${t(k)}</button>`).join("")}
        </div>
        <div id="output"></div>
      </section>
    </div>

    <aside class="preview">
      <div class="preview-bar">
        <h2>${t("preview")}</h2>
        <span class="spacer"></span>
        <select id="pretend" aria-label="${t("pretend")}"></select>
        <div class="segmented compact mini" role="radiogroup">
          ${["light", "dark"].map((v) => `<label><input type="radio" name="theme" value="${v}" ${state.theme === v ? "checked" : ""}><span><b>${t(v)}</b></span></label>`).join("")}
        </div>
      </div>
      <div id="problems" class="problems" hidden></div>
      <div id="frame" class="frame" data-theme="${state.theme}"></div>
      <p class="note">${t("previewNote")}${CALENDAR_API ? ` ${t("graphSource", new URL(CALENDAR_API).host)}` : ""}</p>
    </aside>
  </main>
  <footer>${t("footer")} · <a href="https://github.com/qwerty-ll/CustomizeYouProfile" target="_blank" rel="noopener">qwerty-ll/CustomizeYouProfile</a></footer>`;
  renderStatus();
  renderCountdowns();
  renderPretend();
  renderOutput();
  schedulePreview();
}

function renderStatus() {
  const el = $("#status");
  const s = state.status;
  if (s.kind === "loading") el.innerHTML = `<span class="spinner"></span>${t("loading")}`;
  else if (s.kind === "error") el.innerHTML = `<span class="bad">${esc(s.reason === "notfound" ? t("errNotFound", s.login) : s.reason === "ratelimit" ? t("errRate") : t("errNetwork"))}</span>`;
  else if (s.kind === "loaded") {
    const p = state.ctx.profile;
    const repo = state.repo.exists ? `<span class="good">✓ ${t("repoOk")}</span>` : `<span class="warn">${t("repoMissing")}</span>`;
    el.innerHTML = `${state.avatar ? `<img class="avatar" src="${esc(state.avatar)}" alt="">` : ""}
      <span><b>${esc(p.name)}</b> <span class="muted">@${esc(state.ctx.login)}</span><br>
      <small>${s.sample ? repo : `${esc(t("loaded", state.ctx.total))} · ${repo}`}</small>
      ${s.sample ? `<br><small class="warn">${t("sampleYear")}</small>` : ""}</span>`;
  } else el.innerHTML = `<span class="muted">${t("demo")}</span>`;
}

function renderCountdowns() {
  const rows = state.cfg.countdowns.map((c, i) => `
    <div class="row cd">
      <input type="date" data-cd="${i}" data-k="date" value="${esc(c.date)}" aria-label="${t("date")}">
      <input data-cd="${i}" data-k="label" value="${esc(c.label)}" placeholder="${esc(t("labelPh"))}" maxlength="40" aria-label="${t("label")}">
      <button type="button" class="icon" data-cd-del="${i}" aria-label="remove">×</button>
    </div>`).join("");
  const canAdd = state.cfg.countdowns.length + (state.cfg.toBirthday ? 1 : 0) < 3;
  $("#countdowns").innerHTML = `${rows}
    ${canAdd ? `<button type="button" class="link" id="cd-add">${t("addDate")}</button>` : ""}
    <label class="check"><input type="checkbox" name="toBirthday" ${state.cfg.toBirthday ? "checked" : ""} ${birthdayValue() ? "" : "disabled"}> ${t("toBirthday")}</label>`;
}

function renderPretend() {
  const opts = [
    ["today", t("today"), true],
    ["new-year", t("pretendNY"), state.cfg.seasons.includes("new-year")],
    ["halloween", t("pretendHW"), state.cfg.seasons.includes("halloween")],
    ["birthday", t("pretendBD"), !!birthdayValue()],
  ];
  if (!opts.find(([v, , on]) => v === state.pretend && on)) state.pretend = "today";
  $("#pretend").innerHTML = opts.map(([v, l, on]) => `<option value="${v}" ${on ? "" : "disabled"} ${state.pretend === v ? "selected" : ""}>${esc(l)}${on ? "" : ` ${t("pretendOff")}`}</option>`).join("");
}

function renderOutput() {
  const cfg = configForOutput();
  const el = $("#output");
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === state.tab)));
  if (!cfg.effects.length) { el.innerHTML = `<p class="hint">${t("emptyPreview")}</p>`; return; }
  const yaml = workflowYaml(cfg);
  const code = (text, id) => `<div class="code"><button type="button" class="btn small copy" data-copy="${id}">${t("copy")}</button><pre id="${id}">${esc(text)}</pre></div>`;
  if (state.tab === "command") {
    el.innerHTML = `${code(installCommand(cfg), "cmd")}<p class="hint">${t("cmdNote")}</p>`;
  } else if (state.tab === "file") {
    el.innerHTML = `${code(yaml, "yaml")}<p class="hint">${t("fileNote")}</p>`;
  } else {
    const loaded = state.status.kind === "loaded";
    if (!loaded) { el.innerHTML = `<p class="hint">${t("needLogin")}</p>`; return; }
    const login = state.ctx.login, repo = state.repo;
    const steps = [];
    if (!repo.exists) steps.push(`<li><p>${t("stepRepo", esc(login))}</p><a class="btn" href="${newRepoUrl(login)}" target="_blank" rel="noopener">${t("createRepo")}</a></li>`);
    steps.push(repo.hasWorkflow
      ? `<li><p>${t("stepEdit")}</p><a class="btn" href="${editWorkflowUrl(login, repo.branch)}" target="_blank" rel="noopener">${t("editWorkflow")}</a></li>`
      : `<li><p>${t("stepAdd")}</p><a class="btn primary" href="${newWorkflowUrl(login, repo.branch, yaml)}" target="_blank" rel="noopener">${t("addWorkflow")}</a></li>`);
    steps.push(`<li><p>${t("stepWait")}</p><a class="btn" href="${actionsUrl(login)}" target="_blank" rel="noopener">${t("openActions")}</a> <a class="btn" href="https://github.com/${login}" target="_blank" rel="noopener">${t("openProfile")}</a></li>`);
    el.innerHTML = `<ol class="steps">${steps.join("")}</ol>`;
  }
}

// ---------- preview ----------
let previewTimer = 0, previewRun = 0, urls = [];
function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 180); }

async function renderPreview() {
  const run = ++previewRun;
  const frame = $("#frame"), problems = $("#problems");
  frame.dataset.theme = state.theme;
  const cfg = configForOutput();
  if (!cfg.effects.length) { frame.innerHTML = `<p class="empty">${t("emptyPreview")}</p>`; problems.hidden = true; return; }
  let settings, selected, warnings = [];
  try {
    settings = resolveSettings({ ...cfg, today: pretendDate() });
    ({ selected, warnings } = resolveEffects(cfg.effects.join(","), settings.modes));
  } catch (err) {
    problems.hidden = false;
    problems.textContent = err.message;
    return;
  }
  problems.hidden = !warnings.length;
  problems.textContent = warnings.join(" ");
  const ctx = state.ctx ?? DEMO_CTX;
  const options = { ...settings.options, avatar: state.avatar };
  const items = [];
  for (const id of selected) {
    const files = await renderEffect(id, ctx, options);
    if (run !== previewRun) return;                        // a newer change superseded this one
    const pick = (state.theme === "dark" && files.find((f) => f.file.endsWith("-dark.svg"))) || files.find((f) => !f.file.endsWith("-dark.svg"));
    items.push({ id, url: URL.createObjectURL(new Blob([pick.svg], { type: "image/svg+xml" })) });
  }
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls = items.map((i) => i.url);
  frame.innerHTML = items.map((i) => `<figure><img src="${i.url}" alt="${esc(EFFECTS[i.id].alt)}"><figcaption>${esc(effectTitle(i.id))}</figcaption></figure>`).join("");
}

// ---------- loading a user ----------
async function loadUser(login) {
  login = login.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").split(/[/?#]/)[0];
  if (!login) return;
  state.login = login;
  state.status = { kind: "loading" };
  renderStatus();
  try {
    const { user, repo, calendar } = await fetchPublicProfile(login);
    const sample = calendar === "sample";
    state.ctx = buildContext(user.login, sample ? { ...user, contributionsCollection: sampleYear(user.login) } : user);
    state.repo = repo;
    state.avatar = safeAvatar(await fetchAvatarDataUri(user.avatarUrl));
    state.status = { kind: "loaded", sample };
    store.set("login", user.login);                       // remember only names that worked
    const url = new URL(location.href);
    url.searchParams.set("u", user.login);
    history.replaceState(null, "", url);
  } catch (err) {
    state.ctx = null; state.avatar = null; state.repo = null;
    state.status = { kind: "error", reason: err instanceof LoadError ? err.kind : "network", login };
  }
  renderStatus();
  renderOutput();
  schedulePreview();
}

// ---------- events ----------
function changed({ countdowns = false, pretend = false } = {}) {
  save();
  if (countdowns) renderCountdowns();
  if (pretend) renderPretend();
  renderOutput();
  schedulePreview();
}

document.addEventListener("submit", (e) => {
  if (e.target.id === "login-form") { e.preventDefault(); loadUser($("#login").value); }
});

document.addEventListener("input", (e) => {
  const el = e.target, cfg = state.cfg;
  if (el.dataset.cd !== undefined) { cfg.countdowns[+el.dataset.cd][el.dataset.k] = el.value; return changed(); }
  if (["name", "skills", "tagline"].includes(el.name)) { cfg[el.name] = el.value; return changed(); }
});

document.addEventListener("change", (e) => {
  const el = e.target, cfg = state.cfg;
  switch (el.name) {
    case "effect": {
      const set = new Set(cfg.effects);
      el.checked ? set.add(el.value) : set.delete(el.value);
      cfg.effects = [...set];
      return changed();
    }
    case "season": {
      const set = new Set(cfg.seasons);
      el.checked ? set.add(el.value) : set.delete(el.value);
      cfg.seasons = [...set];
      return changed({ pretend: true });
    }
    case "style": case "language": case "position": cfg[el.name] = el.value; return changed();
    case "bMonth": case "bDay":
      cfg[el.name] = el.value;
      if (!birthdayValue()) cfg.toBirthday = false;
      return changed({ countdowns: true, pretend: true });
    case "toBirthday": cfg.toBirthday = el.checked; return changed({ countdowns: true });
    case "theme": state.theme = el.value; document.documentElement.dataset.theme = state.theme; save(); return schedulePreview();
  }
  if (el.id === "pretend") { state.pretend = el.value; schedulePreview(); }
});

document.addEventListener("click", async (e) => {
  const el = e.target.closest("button, a");
  if (!el) return;
  if (el.id === "ui-lang") { state.ui = state.ui === "ru" ? "en" : "ru"; save(); return renderShell(); }
  if (el.dataset.all !== undefined) {
    state.cfg.effects = el.dataset.all === "1" ? Object.keys(EFFECTS).filter((id) => id !== "countdown") : [];
    document.querySelectorAll('input[name="effect"]').forEach((i) => (i.checked = state.cfg.effects.includes(i.value)));
    return changed();
  }
  if (el.id === "cd-add") { state.cfg.countdowns.push({ date: "", label: "" }); return changed({ countdowns: true }); }
  if (el.dataset.cdDel !== undefined) { state.cfg.countdowns.splice(+el.dataset.cdDel, 1); return changed({ countdowns: true }); }
  if (el.dataset.tab) { state.tab = el.dataset.tab; return renderOutput(); }
  if (el.dataset.copy) {
    const text = $(`#${el.dataset.copy}`).textContent;
    try { await navigator.clipboard.writeText(text); } catch {
      const r = document.createRange(); r.selectNodeContents($(`#${el.dataset.copy}`));
      getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand("copy");
    }
    el.textContent = t("copied");
    setTimeout(() => (el.textContent = t("copy")), 1500);
  }
});

// ---------- start ----------
renderShell();
const fromUrl = new URL(location.href).searchParams.get("u");
const remembered = store.get("login", "");
if (fromUrl || remembered) {
  $("#login").value = fromUrl || remembered;
  loadUser(fromUrl || remembered);
}
