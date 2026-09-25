<div align="center">

# ✨ CustomizeYouProfile

**Animated effects for your GitHub profile, drawn from *your* GitHub data and refreshed every day.**

Pick the effects you like, run one command (or add one workflow file), and they appear on your profile.
Every image is generated from your own contributions, repositories and stats, so nobody else's profile looks like yours.

[Gallery](#-gallery) · [Install in one command](#-install-in-one-command) · [Manual setup](#-manual-setup) · [Options](#%EF%B8%8F-options) · [FAQ](#-faq) · [На русском](#-на-русском)

</div>

---

## 🎨 Gallery

These previews are regenerated daily from [@qwerty-ll](https://github.com/qwerty-ll)'s real data, which is exactly what you'll get with yours.

### About you

#### `intro`: Intro banner
Your name in glitching neon over a drifting aurora, with lines about you typed and erased one after another. Set them with `name` and `tagline`.

<img alt="Intro" src="examples/intro.svg" width="100%">

#### `skills`: Tech stack
Two rows of neon chips gliding in opposite directions. Set the list with `skills`, or leave it empty to use your top languages.

<img alt="Skills" src="examples/skills.svg" width="100%">

#### `rpg-card`: RPG character card
Your profile as a character sheet: avatar, level from your contributions, XP bar, six stats (commits, repos, PRs, followers, streak, stars), a class from your top language (*TypeScript Paladin*, *Python Mage*…) and achievements that unlock one by one.

<img alt="RPG card" src="examples/rpg-card.svg" width="100%">

#### `languages`: Languages equalizer
Your top languages by code size in public repositories, as a neon LED equalizer that bounces like music.

<img alt="Languages" src="examples/languages.svg" width="100%">

### Your contribution year

#### `dino-run`: Dino run
A synthwave T-rex runs through your year and jumps over commit-cacti; taller cactus = busier day. Seasons change on the way (autumn leaves, winter snow under the moon, spring petals, summer fireflies), with a live score and a finale.

<img alt="Dino run" src="examples/dino-run.svg" width="100%">

#### `fireworks`: Fireworks
One rocket per month over a night city (a busy month gets a huge burst, a quiet one just fizzles), then the finale rocket's sparks fly into place and draw your whole contribution graph in the sky. Around New Year (Dec 15 to Jan 15) it becomes a *Happy New Year* show with snow.

<img alt="Fireworks" src="examples/fireworks.svg" width="100%">

#### `black-hole`: Black hole
A black hole opens in the middle of your contribution graph, spirals every square into itself, collapses in a big bang, and the graph re-forms.

<img alt="Black hole" src="examples/black-hole.svg" width="100%">

#### `oscilloscope`: Oscilloscope
An old CRT scope sweeps a green phosphor trace of your daily commits, with scanlines, glow and peak markers.

<img alt="Oscilloscope" src="examples/oscilloscope.svg" width="100%">

#### `terminal`: Terminal
A terminal types `git log --stats`, prints your graph as ASCII art, then your stats: best day, streaks, top weekday and month, commits per month.

<img alt="Terminal" src="examples/terminal.svg" width="100%">

#### `notebook`: Notebook
A pencil shades your year into a squared school notebook, then the teacher circles an **A+**. Supports English and Russian (`language: ru`).

<img alt="Notebook" src="examples/notebook.svg" width="100%">

#### `space-shooter`: Space shooter
A spaceship shoots down your commits as they fly at it, biggest first. Comes in light and dark versions that follow the viewer's GitHub theme.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/space-shooter-dark.svg">
  <img alt="Space shooter" src="examples/space-shooter.svg" width="100%">
</picture>

---

## 🚀 Install in one command

You need the [GitHub CLI](https://cli.github.com) logged in (`gh auth login`). Then:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/qwerty-ll/CustomizeYouProfile/main/install.sh) intro,rpg-card,dino-run
```

Replace `intro,rpg-card,dino-run` with the effects you want, or use `all`. To personalize the text, put variables in front:

```bash
NAME="Mona" TAGLINE="Frontend dev|Cat person|Ships on Fridays" SKILLS="TypeScript,React,Go,Figma" \
  bash <(curl -fsSL https://raw.githubusercontent.com/qwerty-ll/CustomizeYouProfile/main/install.sh) all
```

The script:

1. creates your profile repository `<you>/<you>` if you don't have one yet,
2. adds `.github/workflows/profile-effects.yml`,
3. starts the first run. About a minute later the effects are on your profile.

If you already have a profile README, it stays as it is. The images go into their own marked block at the top. Add `DRY_RUN=1` in front of the command to see what it would do without changing anything.

## 🛠 Manual setup

1. Make sure you have a repository named exactly like your username (`<you>/<you>`). Its README is your profile page.
2. Add `.github/workflows/profile-effects.yml` to it:

```yaml
name: Profile effects

on:
  schedule:
    - cron: "0 3 * * *"   # every day
  workflow_dispatch:       # plus a "Run workflow" button

permissions:
  contents: write

jobs:
  effects:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: qwerty-ll/CustomizeYouProfile@v1
        with:
          effects: intro, skills, rpg-card, dino-run
          name: Mona
          tagline: Frontend dev|Cat person|Ships on Fridays
          skills: TypeScript, React, Go, Figma
```

3. Open the **Actions** tab, choose **Profile effects**, and click **Run workflow**.

The action writes the SVGs to `profile-effects/` and adds this block to your README (creating the README if needed):

```html
<!-- customize-you-profile:start -->
... your effects ...
<!-- customize-you-profile:end -->
```

You can move that block anywhere in your README; later runs update it in place and never touch anything outside it.

## ⚙️ Options

| Input | Default | What it does |
|---|---|---|
| `effects` | `dino-run` | Comma-separated ids, or `all`: `intro`, `skills`, `rpg-card`, `languages`, `dino-run`, `fireworks`, `black-hole`, `oscilloscope`, `terminal`, `notebook`, `space-shooter` |
| `name` | your GitHub name | Name shown in `intro` |
| `tagline` | a few facts about you | Lines typed in `intro`, separated by <code>&#124;</code> |
| `skills` | your top languages | Comma-separated list for `skills` |
| `language` | `en` | Text language for effects that have text (`notebook`): `en` or `ru` |
| `readme` | `README.md` | README to add the images to |
| `readme-position` | `top` | Where the block goes the first time: `top` or `bottom` |
| `update-readme` | `true` | `false` = only write the SVG files; place them yourself |
| `output-dir` | `profile-effects` | Where the SVG files go |
| `login` | repo owner | Draw someone else's contributions |
| `commit` | `true` | `false` = don't commit; handle it in your own steps |
| `commit-message` | `Update profile effects` | Commit message |
| `token` | `github.token` | Token used to read contributions (see FAQ about private ones) |

Want to place the images yourself, for example side by side in a table? Use `update-readme: false` and reference `profile-effects/<effect>.svg`.

## ❓ FAQ

**Will everyone who uses it see my commits?**
No. The action reads the data of the repository owner (or `login`), so each profile shows its own graph and stats. Decorations like mountains, city lights and stars are also seeded from your username, so the scenery is unique too.

**What data does it read?**
Your contribution calendar and totals, follower count, PR and issue counts, and your **public** repositories (for stars and languages). Private repositories are never read, so their names and languages can't leak into a public image.

**Do I need to update anything next year?**
No. Every run draws the last 12 months from GitHub, so it just keeps rolling. If the action itself gets improvements, `@v1` picks them up automatically.

**My profile is super busy / almost empty. Will it still look right?**
Yes. Sizes are scaled to *your* busiest day, busy profiles show their biggest days (for example the 40 largest cacti), and every effect loops in under 40 seconds. It was tested on profiles with 0, ~270, ~1 000 and ~4 600 yearly contributions, and every change runs an automatic check over empty, light, heavy and odd profiles.

**Private contributions aren't counted.**
The default `github.token` only sees public activity. To have private contributions counted, turn on *Private contributions* in your profile settings, create a [personal access token](https://github.com/settings/tokens) (classic, `read:user` scope), save it as a repository secret named `PROFILE_TOKEN`, and add `token: ${{ secrets.PROFILE_TOKEN }}` under `with:`.

**The images didn't change today.**
GitHub caches README images for a few minutes, so refresh a little later. Also check the Actions tab. GitHub pauses scheduled workflows in repositories with no activity for 60 days; if that happens, click **Enable workflow** there.

**How do I remove it?**
Delete `.github/workflows/profile-effects.yml`, the `profile-effects/` folder, and the marked block in your README.

**Can I run it locally?**
```bash
GITHUB_TOKEN=$(gh auth token) node src/cli.mjs --login <you> --effects all --out out --no-readme
```
Node 18+ with no dependencies.

---

## 🇷🇺 На русском

**CustomizeYouProfile** — анимированные эффекты для профиля GitHub, которые рисуются из **твоих** коммитов и обновляются каждый день.

**Установка одной командой** (нужен залогиненный [GitHub CLI](https://cli.github.com)):

```bash
LANGUAGE=ru NAME="Макар" TAGLINE="фронтенд и геймджемы|пишу код за кофе" SKILLS="JavaScript,React,C#,Unity" \
  bash <(curl -fsSL https://raw.githubusercontent.com/qwerty-ll/CustomizeYouProfile/main/install.sh) intro,rpg-card,dino-run,notebook
```

Скрипт сам создаст репозиторий профиля `<ник>/<ник>`, если его нет, добавит workflow и запустит первую генерацию. Если README уже есть, твой текст останется, а картинки встанут в отдельный помеченный блок.

- **У каждого свой дизайн:** Action берёт коммиты владельца репозитория, а декорации тоже зависят от ника.
- **Раз в год обновлять не нужно:** каждый день рисуются последние 12 месяцев.
- **Эффекты про тебя:** `intro` (имя и печатающиеся строки: `name`, `tagline`), `skills` (твой стек: `skills`), `rpg-card` (карточка персонажа: уровень, характеристики, класс, ачивки), `languages` (языки из публичных репозиториев).
- **Эффекты по коммитам:** `dino-run`, `fireworks`, `black-hole`, `oscilloscope`, `terminal`, `notebook` (с `language: ru` на русском: «Классная работа» и «5+»), `space-shooter`, или `all`.
- **Приватные репозитории не читаются**, в картинку попадают только публичные данные.
- Все настройки описаны в разделе [Options](#%EF%B8%8F-options), ответы на вопросы в [FAQ](#-faq).

---

<div align="center">

MIT © [qwerty-ll](https://github.com/qwerty-ll) · If you like it, a ⭐ helps others find it.

</div>
