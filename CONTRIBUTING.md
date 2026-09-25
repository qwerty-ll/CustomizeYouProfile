# Contributing

Thanks for helping! Bugs and effect ideas are welcome as [issues](https://github.com/qwerty-ll/CustomizeYouProfile/issues/new/choose); this page is about changing the code. Security problems go through [SECURITY.md](SECURITY.md) instead.

## Project layout

| Path | What it is |
|---|---|
| `action.yml` | The composite action users run: hands the inputs to `src/cli.mjs` through environment variables, then commits and pushes the result |
| `src/cli.mjs` | The CLI the action runs: fetches the profile, renders the chosen effects, writes the SVGs and updates the README block |
| `src/effects/*.mjs` | One file per effect; the file name is the effect id |
| `src/styles/clean/`, `src/styles/neon/` | The two looks of `intro`, `skills` and `dino-run` (`style: clean` or `neon`) |
| `src/scenes/` | Parts several effects share: the dino's jump plan and obstacles, the typewriter text |
| `src/registry.mjs` | The effect catalog (title, blurb, alt text, group; its order is the order of `all`) and `resolveEffects()`, which turns the `effects` input into a list. Shared with the configurator |
| `src/lib.mjs` | The GitHub API query, `buildContext()` (what every effect receives) and shared helpers: seeded `rng`, `keyframeBuilder`, `esc`, `topDays`, GitHub colors |
| `src/render.mjs` | Renders one effect the way the action does, seasonal overlays included, and builds the README markup |
| `src/decorate.mjs` | Seasonal overlays drawn on top of any effect: snow and a garland, bats and pumpkins, confetti and balloons |
| `src/seasonal.mjs` | Parses `seasons`, `birthday` and `countdown`, works out which modes are on today, and holds their EN/RU texts |
| `src/settings.mjs` | Turns raw inputs (from the action, the CLI or the configurator) into render options and today's modes |
| `src/readme.mjs` | The marked README block: adds it, refreshes it, and leaves the README alone if the markers are damaged |
| `src/demo.mjs` | Synthetic profiles: the configurator's demo and sample year, and the test fixtures |
| `site/` | The configurator, a static page that draws the previews in the browser with the same `src/` code: `app.mjs` (UI), `data.mjs` (public data), `output.mjs` (the workflow file and the command), `i18n.mjs` (EN/RU text), `build.mjs` and `serve.mjs` |
| `test/validate.mjs` | The whole test suite |
| `examples/` | The README gallery, regenerated daily by `.github/workflows/preview.yml`. Don't edit it by hand |
| `install.sh` | The one-command installer. It must stay at the repository root: users `curl` it from `main` |
| `.github/workflows/` | `test.yml` (tests), `preview.yml` (gallery), `pages.yml` (deploys the configurator), `release.yml` (releases) |

## Development

You need Node 20 or newer. There are no dependencies, so there's nothing to install.

```bash
npm test        # node test/validate.mjs, then bash test/install.test.sh
npm run build   # builds the configurator into _site/
npm run dev     # builds it and serves it at http://localhost:8080, rebuilding on every page reload
```

To render the effects from your own profile, run the CLI and open the SVGs from `out/` in a browser:

```bash
GITHUB_TOKEN=$(gh auth token) node src/cli.mjs --login <you> --effects all --out out --no-readme
```

Add `CALENDAR_CACHE=/tmp/me.json` in front to save the API response on the first run and reuse it on the next ones (see `fetchProfile()` in `src/lib.mjs`). The other flags mirror the action's inputs, for example `--style neon`, `--language ru`, `--seasons all --today 2026-12-31`, `--birthday 03-15` or `--countdown "2026-12-31 Release"`.

`npm test` also runs `test/install.test.sh`, which drives `install.sh` against a stub `gh` and checks the workflow it would upload; CI runs it on bash 3.2 too (the version macOS ships), plus `shellcheck install.sh`. To try the installer for real without changing anything: `DRY_RUN=1 bash install.sh intro`. Its settings variables start with `CYP_` (`CYP_NAME`, `CYP_TAGLINE`, …) so they don't clash with common environment variables: WSL sets `NAME` to the computer name, and gettext reads `LANGUAGE`.

## Writing an effect

An effect is `src/effects/<id>.mjs` whose default export takes the context and the options and returns the SVG files. It may be async.

```js
export default function render(ctx, options) {
  return [{ file: "<id>.svg", svg: "<svg …>…</svg>" }];
}
```

- `ctx` comes from `buildContext()` in `src/lib.mjs`: `login`, `days` (every day of the last year with `date`, `count`, `level` 0–4 and its place in the graph, `col` and `row`), `weeks`, `total`, `maxCount`, and `profile` (name, followers, repos, stars, PRs, streak, `languages` and more).
- `options` comes from `resolveSettings()` in `src/settings.mjs`: `style`, `language`, `name`, `tagline` and `skills` (both arrays), `modes` (today's seasonal modes and countdowns), plus `avatar` (a data URI or `null`) for effects marked `avatar: true` in the registry.
- **Light and dark.** Return one file, or a pair: `<id>.svg` and `<id>-dark.svg`. The README block and the configurator turn a `-dark.svg` file into a `<picture>` that follows the viewer's theme.
- **Deterministic.** The same data gives the same image. Use `rng(seedFor(ctx.login, <salt>))` from `src/lib.mjs` instead of `Math.random()`, so every user gets their own scenery and it stays the same from day to day.
- **Safe.** Pass all user text through `esc()`. No scripts and no external URLs: GitHub shows README images through `<img>`, where neither works. That's why the avatar is embedded as a data URI.
- **Small.** Well-formed XML under 400 KB. On busy profiles draw only the biggest days (`topDays()`; `dino-run` uses the top 40).
- **Looping.** Build the timeline with `keyframeBuilder(duration)` and run it on one shared class (the existing effects use `.m`, with a single `animation-duration`), at most 45 s per loop. Don't animate anything inside a `<clipPath>`: Safari ignores it in `<img>` SVGs.
- **Ready for overlays.** Give the root `<svg>` numeric `width` and `height` (most effects are 860 px wide), since the seasonal overlays are sized from them. A light version with a transparent background also gets `data-bg="light"`, so the overlays stay visible on a white page.

`npm test` renders every file in `src/effects/` for four synthetic profiles (empty, light, very busy, very long names) with both styles, `en` and `ru`, and all modes off and on. It fails on malformed XML (unbalanced tags, duplicate attributes, a stray `<`), a file of 400 KB or more, a loop over 45 s, an animation inside a `<clipPath>`, an unescaped `<script`, or `NaN`, `undefined` or `Infinity` in the output.

## Adding an effect: checklist

1. `src/effects/<id>.mjs`: the effect itself. The tests pick it up automatically.
2. `src/registry.mjs`: an entry in `EFFECTS` with `group` (`you` or `year`, the configurator's two sections), `title`, `blurb` and `alt` (the image's alt text in users' READMEs), plus `avatar: true` if it needs the profile picture. Its position in the list is its place in `all`.
3. `action.yml`: the id in the list in the `effects` description.
4. `install.sh`: the id in `AVAILABLE`.
5. `site/i18n.mjs`: a Russian title and blurb in `EFFECT_TEXT_RU` (a test checks that every effect has them).
6. `README.md` and `README.ru.md`: a gallery entry showing `examples/<id>.svg` (in a `<picture>` with `examples/<id>-dark.svg` if there's a dark version). Both READMEs must show every effect. The image itself appears after the Preview workflow runs on `main`; don't commit files in `examples/`.
7. `npm test`, then look at it in the configurator with `npm run dev`.

To retire an effect, move its id from `EFFECTS` to `REMOVED` in `src/registry.mjs`: workflows that still list it keep working with a warning, and its old SVGs are deleted on their next run.

## Releases

Users run `@v1`, which always points at the latest release. To publish one, tag a commit on `main` and push the tag:

```bash
git tag v1.5.0 && git push origin v1.5.0
```

The Release workflow (`.github/workflows/release.yml`) runs the tests, creates the GitHub release with generated notes and moves the major tag `v1` to it, so everyone on `@v1` gets it on their next run. That's why inputs must stay backward compatible: a breaking change would need a `v2.0.0` tag (the workflow then moves `v2`) and the docs, the configurator and `install.sh` switched to `@v2`.

The rest deploys from `main` without a release: `pages.yml` publishes the configurator when `site/` or `src/` changes, and `preview.yml` regenerates the gallery every day and when `src/` or `action.yml` changes.
