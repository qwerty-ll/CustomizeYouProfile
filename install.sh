#!/usr/bin/env bash
# One-command setup for CustomizeYouProfile.
#
#   bash <(curl -fsSL https://raw.githubusercontent.com/qwerty-ll/CustomizeYouProfile/main/install.sh) dino-run,fireworks
#
# Uses the GitHub CLI (gh) you are already logged into. It:
#   1. creates your profile repository <you>/<you> if it doesn't exist yet,
#   2. adds .github/workflows/profile-effects.yml with the effects you chose,
#   3. starts the first run, which adds the images to your README.
# Optional settings, as CYP_* variables in front of the command:
#   CYP_NAME="Mona" CYP_TAGLINE="Frontend dev|Loves cats" CYP_SKILLS="React,Go" CYP_LANGUAGE=ru
#   CYP_SEASONS="new-year,halloween" CYP_BIRTHDAY=03-15 CYP_COUNTDOWN="2026-12-31 Release; birthday"
#     (seasonal/birthday/countdown modes stay off unless you set them)
#   CYP_STYLE=neon for the glowing synthwave look instead of the calm default
#   CYP_README_POSITION=bottom to add the images at the end of an existing README
# Easiest: build this command in the configurator, https://qwerty-ll.github.io/CustomizeYouProfile/
# Set DRY_RUN=1 to only print what would happen. Your README text is never replaced:
# the images go into their own marked block.

set -euo pipefail

EFFECTS="${1:-dino-run}"
# The older unprefixed names (TAGLINE=…) still work, except NAME and LANGUAGE:
# WSL sets NAME to the computer's name, and LANGUAGE is the system's locale list.
style="${CYP_STYLE:-${STYLE:-}}"
language="${CYP_LANGUAGE:-en}"
name="${CYP_NAME:-}"
tagline="${CYP_TAGLINE:-${TAGLINE:-}}"
skills="${CYP_SKILLS:-${SKILLS:-}}"
seasons="${CYP_SEASONS:-${SEASONS:-}}"
birthday="${CYP_BIRTHDAY:-${BIRTHDAY:-}}"
countdown="${CYP_COUNTDOWN:-${COUNTDOWN:-}}"
position="${CYP_README_POSITION:-${README_POSITION:-}}"
ACTION_REF="${ACTION_REF:-qwerty-ll/CustomizeYouProfile@v1}"
WORKFLOW_PATH=".github/workflows/profile-effects.yml"
AVAILABLE="intro skills rpg-card languages dino-run fireworks black-hole oscilloscope terminal notebook space-shooter countdown"

say() { printf '\033[1;35m›\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }
run() { if [ -n "${DRY_RUN:-}" ]; then printf '  [dry run] %s\n' "$*"; else "$@"; fi; }

command -v gh >/dev/null || die "GitHub CLI not found. Install it from https://cli.github.com and run: gh auth login"
gh auth status >/dev/null 2>&1 || die "GitHub CLI is not logged in. Run: gh auth login"

if [ "$EFFECTS" != "all" ]; then
  read -r -a REQUESTED <<< "${EFFECTS//,/ }"   # no glob expansion, one line only
  [ "${#REQUESTED[@]}" -gt 0 ] || die "No effects given. Available: $AVAILABLE (or all)"
  for e in "${REQUESTED[@]}"; do
    [[ " $AVAILABLE " == *" $e "* ]] || die "Unknown effect '$e'. Available: $AVAILABLE (or all)"
  done
  EFFECTS=$(printf '%s, ' "${REQUESTED[@]}")   # normalized: only validated ids go into the workflow
  EFFECTS="${EFFECTS%, }"
fi

LOGIN=$(gh api user --jq .login)
REPO="$LOGIN/$LOGIN"
say "GitHub user: $LOGIN"
say "Effects: $EFFECTS"

if gh repo view "$REPO" >/dev/null 2>&1; then
  say "Profile repository $REPO exists; the images go into a marked block, the rest of your README stays as it is."
else
  say "Creating your profile repository $REPO"
  run gh repo create "$REPO" --public --add-readme --description "My GitHub profile"
fi

WORKFLOW=$(cat <<YAML
name: Profile effects

on:
  schedule:
    - cron: "0 3 * * *"   # every day
  workflow_dispatch:
  push:                   # also run right after this file is added or edited
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
      - uses: $ACTION_REF
        with:
          effects: $EFFECTS
YAML
)
# optional personal text, quoted for YAML. Line breaks become spaces (they would
# break the file) and "${{" is defused: GitHub evaluates ${{ … }} in `with:`
# values, so e.g. ${{ github.token }} in a tagline would end up in a public image.
yaml_quote() {
  printf '"%s"' "$(printf '%s' "$1" | tr '\000-\037\177' ' ' | sed 's/\\/\\\\/g; s/"/\\"/g; s/\$[{][{]/$ {{/g')"
}
# same order as the configurator's workflow file
[ -n "$style" ] && WORKFLOW+=$'\n'"          style: $(yaml_quote "$style")"
[ "$language" != "en" ] && WORKFLOW+=$'\n'"          language: $(yaml_quote "$language")"
[ -n "$name" ] && WORKFLOW+=$'\n'"          name: $(yaml_quote "$name")"
[ -n "$tagline" ] && WORKFLOW+=$'\n'"          tagline: $(yaml_quote "$tagline")"
[ -n "$skills" ] && WORKFLOW+=$'\n'"          skills: $(yaml_quote "$skills")"
[ -n "$seasons" ] && WORKFLOW+=$'\n'"          seasons: $(yaml_quote "$seasons")"
[ -n "$birthday" ] && WORKFLOW+=$'\n'"          birthday: $(yaml_quote "$birthday")"
[ -n "$countdown" ] && WORKFLOW+=$'\n'"          countdown: $(yaml_quote "$countdown")"
[ -n "$position" ] && WORKFLOW+=$'\n'"          readme-position: $(yaml_quote "$position")"

[ -n "${DRY_RUN:-}" ] && printf '%s\n' "$WORKFLOW" | sed 's/^/    /'

SHA=$(gh api "repos/$REPO/contents/$WORKFLOW_PATH" --jq .sha 2>/dev/null) || SHA=""   # 404 prints JSON; discard it
# Only ever replace our own workflow; a different file with the same name is left alone.
if [ -n "$SHA" ] && [ -z "${FORCE:-}" ]; then
  EXISTING=$(gh api "repos/$REPO/contents/$WORKFLOW_PATH" -H "Accept: application/vnd.github.raw" 2>/dev/null || true)
  if [[ "$EXISTING" != *"CustomizeYouProfile"* ]]; then
    die "$WORKFLOW_PATH already exists in $REPO and isn't from CustomizeYouProfile. Rename it, or rerun with FORCE=1 to replace it."
  fi
fi
say "$( [ -n "$SHA" ] && echo Updating || echo Adding ) $WORKFLOW_PATH"
CONTENT=$(printf '%s\n' "$WORKFLOW" | base64 | tr -d '\n')
WRITE_FAILED="Couldn't write $WORKFLOW_PATH. If gh mentions the \"workflow\" scope, run: gh auth refresh -s workflow, then run this again."
if [ -n "$SHA" ]; then
  run gh api -X PUT "repos/$REPO/contents/$WORKFLOW_PATH" -f message="Set up profile effects" -f content="$CONTENT" -f sha="$SHA" --silent || die "$WRITE_FAILED"
else
  run gh api -X PUT "repos/$REPO/contents/$WORKFLOW_PATH" -f message="Set up profile effects" -f content="$CONTENT" --silent || die "$WRITE_FAILED"
fi

say "Starting the first run"
started=""
for _ in 1 2 3 4 5; do
  if run gh workflow run profile-effects.yml -R "$REPO" 2>/dev/null; then started=1; break; fi
  sleep 3   # GitHub needs a moment to register a new workflow
done

if [ -n "$started" ]; then
  say "Done! In about a minute your effects will be at https://github.com/$LOGIN"
else
  say "The workflow is in place, but starting it by hand didn't work. Adding the file usually starts a run anyway;"
  say "if nothing shows up, open the link below and press Run workflow (or wait for tomorrow's run)."
fi
say "Progress: https://github.com/$REPO/actions"
