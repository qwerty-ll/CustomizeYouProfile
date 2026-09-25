<div align="center">

# ✨ CustomizeYouProfile

[English](README.md) · Русский

**Анимированные эффекты для профиля GitHub: рисуются из *твоих* данных GitHub и обновляются каждый день.**

### [🎛 Открыть конструктор →](https://qwerty-ll.github.io/CustomizeYouProfile/)
Выбери эффекты, посмотри их на своём профиле и добавь в один клик. Терминал не нужен.

[![Test](https://github.com/qwerty-ll/CustomizeYouProfile/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/qwerty-ll/CustomizeYouProfile/actions/workflows/test.yml)
[![Built with AI](https://img.shields.io/badge/built%20with-AI%20(Claude)-8A63D2?logo=anthropic&logoColor=white)](#-сделано-с-помощью-ии)

[Быстрый старт](#-быстрый-старт) · [Галерея](#-галерея) · [Сезонные режимы](#-сезонные-и-личные-режимы-по-желанию) · [Настройки](#%EF%B8%8F-настройки) · [Вопросы](#-вопросы-и-ответы)

</div>

## 🚀 Быстрый старт

### 🎛 В браузере (проще всего)

Открой [конструктор](https://qwerty-ll.github.io/CustomizeYouProfile/), введи свой ник и выбери эффекты: превью рисуется по твоим же публичным данным. Потом нажми **Добавить workflow на GitHub**: GitHub откроется с уже заполненным файлом, останется только закоммитить. Репозитория профиля ещё нет? Конструктор сначала поможет его создать.

### 💻 Одной командой

```bash
CYP_LANGUAGE=ru CYP_NAME="Макар" CYP_TAGLINE="фронтенд и геймджемы|пишу код за кофе" \
  bash <(curl -fsSL https://raw.githubusercontent.com/qwerty-ll/CustomizeYouProfile/main/install.sh) intro,rpg-card,dino-run,notebook
```

- Нужен терминал macOS или Linux и [GitHub CLI](https://cli.github.com) с входом в аккаунт (`gh auth login`).
- Перечисли нужные эффекты или напиши `all`. Переменные в начале необязательны: `CYP_NAME`, `CYP_TAGLINE`, `CYP_SKILLS`, `CYP_STYLE`, `CYP_LANGUAGE`, `CYP_SEASONS`, `CYP_BIRTHDAY`, `CYP_COUNTDOWN` и `CYP_README_POSITION` принимают те же значения, что и соответствующие [настройки](#%EF%B8%8F-настройки).
- Скрипт создаст репозиторий профиля, если его нет, добавит workflow и запустит первую генерацию. Примерно через минуту эффекты появятся в профиле.
- Добавь в начало `DRY_RUN=1`, чтобы посмотреть, что сделает скрипт, ничего не меняя.

### 🛠 Ручная настройка

1. Страница профиля показывает README публичного репозитория, который называется точно как твой ник (`<ник>/<ник>`). Создай его, если такого ещё нет.
2. Добавь в него `.github/workflows/profile-effects.yml`:

```yaml
name: Profile effects

on:
  schedule:
    - cron: "0 3 * * *"   # каждый день
  workflow_dispatch:       # кнопка «Run workflow»
  push:                    # и сразу после того, как этот файл добавили или изменили
    paths: [".github/workflows/profile-effects.yml"]

permissions:
  contents: write

concurrency:
  group: profile-effects

jobs:
  effects:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: qwerty-ll/CustomizeYouProfile@v1
        with:
          effects: intro, skills, rpg-card, dino-run, notebook
          language: ru
          name: "Макар"
          tagline: "фронтенд и геймджемы|пишу код за кофе"
          skills: "JavaScript, React, C#, Unity"
```

3. Закоммить его. Первый запуск начнётся сам (или открой **Actions** → **Profile effects** → **Run workflow**). Он сохранит картинки в `profile-effects/` и добавит их в [помеченный блок](#мой-readme-перезапишется) в твоём README.

## 🎨 Галерея

Эти превью каждый день заново генерируются по настоящим данным [@qwerty-ll](https://github.com/qwerty-ll): с твоими данными получится ровно так же.

### О тебе

**Intro** (`intro`): машущая рука, *Hi, I'm …*, строки о тебе, которые печатаются одна за другой, и пара спокойных плашек со статистикой. Текст задают `name` и `tagline`.
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/intro-dark.svg">
  <img alt="Intro" src="examples/intro.svg" width="100%">
</picture>

**Tech stack** (`skills`): две медленные ленты плашек, которые плывут в разные стороны. Твой список `skills` или твои главные языки.
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/skills-dark.svg">
  <img alt="Skills" src="examples/skills.svg" width="100%">
</picture>

**RPG-карточка** (`rpg-card`): твой профиль как лист персонажа: уровень, полоска опыта, шесть характеристик, класс по главному языку (*TypeScript Paladin*, *Python Mage*…) и ачивки.
<img alt="RPG card" src="examples/rpg-card.svg" width="100%">

**Языки** (`languages`): твои главные языки по объёму кода в публичных репозиториях, в виде неонового эквалайзера, который прыгает как под музыку.
<img alt="Languages" src="examples/languages.svg" width="100%">

### Твой год коммитов

**Dino run** (`dino-run`): динозаврик из офлайн-игры Chrome бежит через твой год и перепрыгивает самые активные дни-кактусы (чем выше кактус, тем больше коммитов), пока не наступит *GAME OVER*.
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/dino-run-dark.svg">
  <img alt="Dino run" src="examples/dino-run.svg" width="100%">
</picture>

**Фейерверк** (`fireworks`): по ракете на каждый месяц над ночным городом (активный месяц даёт большой залп, тихий только шипит), а в финале искры рисуют в небе весь твой график.
<img alt="Fireworks" src="examples/fireworks.svg" width="100%">

**Чёрная дыра** (`black-hole`): твой график затягивает в чёрную дыру, она схлопывается в большой взрыв, и график собирается заново.
<img alt="Black hole" src="examples/black-hole.svg" width="100%">

**Осциллограф** (`oscilloscope`): старый ЭЛТ-осциллограф рисует зелёную светящуюся волну твоих коммитов по дням.
<img alt="Oscilloscope" src="examples/oscilloscope.svg" width="100%">

**Терминал** (`terminal`): терминал набирает `git log --stats`, выводит твой график в ASCII, а потом статистику: лучший день, серии, самый активный день недели и месяц, коммиты по месяцам.
<img alt="Terminal" src="examples/terminal.svg" width="100%">

**Тетрадь** (`notebook`): карандаш штрихует твой год в тетради в клетку, а учитель обводит **A+**. С `language: ru` тетрадь русская: «Классная работа» и «5+».
<img alt="Notebook" src="examples/notebook.svg" width="100%">

**Космолёт** (`space-shooter`): корабль сбивает твои коммиты, которые летят ему навстречу, от больших к меньшим.
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="examples/space-shooter-dark.svg">
  <img alt="Space shooter" src="examples/space-shooter.svg" width="100%">
</picture>

<details>
<summary><b>Хочется неона?</b> Добавь <code>style: neon</code>, и <code>intro</code>, <code>skills</code> и <code>dino-run</code> станут светящимися, в стиле synthwave.</summary>
<img alt="Neon intro" src="examples/neon/intro.svg" width="100%">
<img alt="Neon skills" src="examples/neon/skills.svg" width="100%">
<img alt="Neon dino run" src="examples/neon/dino-run.svg" width="100%">
</details>

## 🎉 Сезонные и личные режимы (по желанию)

Дополнительное оформление, которое само включается в нужные даты, но только если ты его настроил: если эти поля пустые, ничего не меняется. `seasons: all` включает оба сезона. Даты считаются по UTC, а картинки меняются при следующем ежедневном запуске. С `language: ru` поздравления и отсчёт пишутся по-русски.

| Поле | Когда | Что меняется |
|---|---|---|
| `seasons: new-year` | 15 дек – 10 янв | Снег и мигающая гирлянда на всех эффектах. Динозаврик в шапке Санты прыгает через ёлки, а финал фейерверка поздравляет с Новым годом |
| `seasons: halloween` | 24 окт – 1 нояб | Летучие мыши, паук и тыквы-фонари на всех эффектах. Динозаврик прыгает через башни из тыкв, а фейерверк становится оранжево-фиолетовым |
| `birthday: "03-15"` | в этот день | Конфетти, воздушные шары и ленточка с поздравлением на всех эффектах. Intro печатает, что сегодня твой день рождения, а финал фейерверка поздравляет тебя |
| `countdown: 2026-12-31 Релиз; birthday` | каждый день | Карточка `countdown` с перекидными цифрами, до 3 дат (`birthday` считает до ближайшего дня рождения и требует поле `birthday`). Intro печатает, сколько дней осталось |

<details>
<summary>Превью: Новый год, Хэллоуин, день рождения, обратный отсчёт</summary>
<table>
<tr><td><b>new-year</b><br><picture><source media="(prefers-color-scheme: dark)" srcset="examples/modes/new-year/dino-run-dark.svg"><img alt="New Year dino" src="examples/modes/new-year/dino-run.svg"></picture></td></tr>
<tr><td><b>halloween</b><br><picture><source media="(prefers-color-scheme: dark)" srcset="examples/modes/halloween/dino-run-dark.svg"><img alt="Halloween dino" src="examples/modes/halloween/dino-run.svg"></picture></td></tr>
<tr><td><b>birthday</b><br><picture><source media="(prefers-color-scheme: dark)" srcset="examples/modes/birthday/intro-dark.svg"><img alt="Birthday intro" src="examples/modes/birthday/intro.svg"></picture></td></tr>
<tr><td><b>countdown</b><br><img alt="Countdown" src="examples/modes/countdown/countdown.svg"></td></tr>
</table>
</details>

## ⚙️ Настройки

| Поле | По умолчанию | Что делает |
|---|---|---|
| `effects` | `dino-run` | Id эффектов через запятую или `all`: `intro`, `skills`, `rpg-card`, `languages`, `dino-run`, `fireworks`, `black-hole`, `oscilloscope`, `terminal`, `notebook`, `space-shooter`. `countdown` добавляется сам, если заполнено поле `countdown` |
| `style` | `clean` | `clean`: спокойные цвета GitHub, светлая и тёмная версии. `neon`: светящийся synthwave для `intro`, `skills` и `dino-run` |
| `name` | имя из GitHub | Имя в `intro` |
| `tagline` | пара фактов о тебе | Строки, которые печатаются в `intro`, через <code>&#124;</code> |
| `skills` | твои главные языки | Список для `skills` через запятую |
| `language` | `en` | `en` или `ru`: язык текста в `notebook`, карточке отсчёта и сезонных поздравлениях |
| `seasons` | выкл. | `new-year`, `halloween` или `all` |
| `birthday` | выкл. | День рождения в формате `MM-DD` (месяц-день) |
| `countdown` | выкл. | До 3 дат через `;`, каждая в виде `YYYY-MM-DD Подпись` или `birthday` |
| `today` | настоящая дата | Притвориться, что сегодня другой день (`YYYY-MM-DD`), чтобы посмотреть режимы |
| `readme` | `README.md` | README, куда добавлять картинки; создаётся, если его нет |
| `readme-position` | `top` | Куда поставить блок в первый раз: `top` (в начало) или `bottom` (в конец) |
| `update-readme` | `true` | `false`: только записать SVG-файлы, а расставить их самому |
| `output-dir` | `profile-effects` | Папка для SVG-файлов |
| `commit` | `true` | `false`: не коммитить и не пушить, это сделают твои собственные шаги |
| `commit-message` | `Update profile effects` | Сообщение коммита |
| `login` | владелец репозитория | Чьи данные рисовать |
| `token` | `github.token` | Токен для чтения данных; см. [приватный вклад](#приватный-вклад-не-учитывается) |

## ❓ Вопросы и ответы

### Мой README перезапишется?
Нет. Картинки живут между `<!-- customize-you-profile:start -->` и `<!-- customize-you-profile:end -->`, и переписывается только этот блок.
- Первый запуск ставит блок в начало README (или в конец, если `readme-position: bottom`) и создаёт README, если его нет; файл с другим регистром букв в имени (`readme.md`, `Readme.md`) тоже находится. Потом блок можно перенести куда угодно: всё вокруг него сохранится.
- Если метки повреждены (одну удалили или блоков два), README остаётся как был, а в логе запуска будет предупреждение.
- Внутри блока руками не правь, он переписывается при каждом запуске. Чтобы расставить картинки по-своему, например рядом в таблице, поставь `update-readme: false` и вставь `profile-effects/<эффект>.svg` сам.
- Установщик не заменит workflow `profile-effects.yml`, который сделан не этим проектом, если только не добавить `FORCE=1`.

### Какие данные читаются?
Только данные того, кого рисует Action (владельца репозитория или `login`): календарь вклада и итоги за год, имя, аватар, возраст аккаунта, число подписчиков, PR и issues, а также его собственные публичные репозитории (100 самых популярных по звёздам, ради звёзд и языков). Приватные репозитории не читаются, так что их названия и языки не попадут в публичную картинку. У каждого профиля свои картинки: даже декорации вроде звёзд и огней города зависят от ника.

### Это безопасно?
Workflow получает только `contents: write` на твой репозиторий профиля, токен уходит только в `api.github.com`, а весь введённый текст экранируется, прежде чем попасть в картинку. Картинки **публичные**, так что не пиши во входные поля ничего личного: если там окажется что-то похожее на токен, запуск остановится и ничего не опубликует. `@v1` сам подхватывает новые релизы; если хочешь проверять каждое обновление, закрепи версию коммитом: `uses: qwerty-ll/CustomizeYouProfile@<sha коммита>`. Подробности в [SECURITY.md](SECURITY.md) (на английском).

### Приватный вклад не учитывается
Стандартный `github.token` видит только публичную активность. Чтобы учитывался приватный вклад, включи *Private contributions* в настройках профиля, создай [personal access token](https://github.com/settings/tokens) (classic, с правом `read:user`), сохрани его как секрет репозитория с именем `PROFILE_TOKEN` и добавь `token: ${{ secrets.PROFILE_TOKEN }}` в `with:`.

### Картинки сегодня не обновились
GitHub кэширует картинки в README на несколько минут, так что загляни чуть позже. Ещё проверь вкладку **Actions**: если запуск упал, там будет видна ошибка (короткие сбои GitHub API повторяются дважды, так что из-за них запуск не падает). А ещё GitHub приостанавливает запуски по расписанию в репозиториях, где 60 дней не было активности; если так случилось, нажми там **Enable workflow**.

### Нужно ли что-то обновлять потом?
Нет. Каждый запуск рисует последние 12 месяцев, а `@v1` сам подхватывает новые релизы. Подойдёт и очень активный, и почти пустой профиль: размеры считаются от твоего самого активного дня, а у активных профилей показываются самые крупные дни.

### Как всё удалить?
Удали `.github/workflows/profile-effects.yml`, папку `profile-effects/` и помеченный блок в README.

## 🤖 Сделано с помощью ИИ

Проект сделан вместе с **Claude** (Anthropic) в [Claude Code](https://claude.com/claude-code): идеи и направление от [@qwerty-ll](https://github.com/qwerty-ll), а Claude пишет и проверяет код, тесты и документацию. У коммитов, сделанных так, есть строка `Co-Authored-By: Claude`.

Нашёл баг или есть идея эффекта? [Открой issue](https://github.com/qwerty-ll/CustomizeYouProfile/issues/new/choose). Хочешь сделать эффект сам? Смотри [CONTRIBUTING.md](CONTRIBUTING.md) (на английском).

<p align="center"><a href="LICENSE">MIT</a> © <a href="https://github.com/qwerty-ll">qwerty-ll</a> · Если проект нравится, поставь ⭐: так его найдут и другие.</p>
