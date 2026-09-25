#!/usr/bin/env bash
# One-command setup for CustomizeYouProfile.
#
#   bash <(curl -fsSL https://raw.githubusercontent.com/qwerty-ll/CustomizeYouProfile/main/install.sh) dino-run,fireworks
#
# Uses the GitHub CLI (gh) you are already logged into. It:
#   1. creates your profile repository <you>/<you> if it doesn't exist yet,
#   2. adds .github/workflows/profile-effects.yml with the effects you chose,
#   3. starts the first run, which adds the images to your README.
# Set DRY_RUN=1 to only print what would happen. Set LANGUAGE=ru for Russian text.

set -euo pipefail

EFFECTS="${1:-dino-run}"
LANGUAGE="${LANGUAGE:-en}"
ACTION_REF="${ACTION_REF:-qwerty-ll/CustomizeYouProfile@v1}"
WORKFLOW_PATH=".github/workflows/profile-effects.yml"
AVAILABLE="dino-run fireworks black-hole solar-system oscilloscope terminal notebook space-shooter"

say() { printf '\033[1;35m›\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }
run() { if [ -n "${DRY_RUN:-}" ]; then printf '  [dry run] %s\n' "$*"; else "$@"; fi; }

command -v gh >/dev/null || die "GitHub CLI not found. Install it from https://cli.github.com and run: gh auth login"
gh auth status >/dev/null 2>&1 || die "GitHub CLI is not logged in. Run: gh auth login"

if [ "$EFFECTS" != "all" ]; then
  for e in ${EFFECTS//,/ }; do
    [[ " $AVAILABLE " == *" $e "* ]] || die "Unknown effect '$e'. Available: $AVAILABLE (or all)"
  done
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
    - cron: "0 3 * * *"   # daily
  workflow_dispatch:

permissions:
  contents: write

jobs:
  effects:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: $ACTION_REF
        with:
          effects: $EFFECTS
          language: $LANGUAGE
YAML
)

SHA=$(gh api "repos/$REPO/contents/$WORKFLOW_PATH" --jq .sha 2>/dev/null) || SHA=""   # 404 prints JSON; discard it
say "$( [ -n "$SHA" ] && echo Updating || echo Adding ) $WORKFLOW_PATH"
CONTENT=$(printf '%s\n' "$WORKFLOW" | base64 | tr -d '\n')
if [ -n "$SHA" ]; then
  run gh api -X PUT "repos/$REPO/contents/$WORKFLOW_PATH" -f message="Set up profile effects" -f content="$CONTENT" -f sha="$SHA" --silent
else
  run gh api -X PUT "repos/$REPO/contents/$WORKFLOW_PATH" -f message="Set up profile effects" -f content="$CONTENT" --silent
fi

say "Starting the first run"
for _ in 1 2 3 4 5; do
  if run gh workflow run profile-effects.yml -R "$REPO" 2>/dev/null; then break; fi
  sleep 3   # GitHub needs a moment to register a new workflow
done

say "Done! In about a minute your effects will be at https://github.com/$LOGIN"
say "Progress: https://github.com/$REPO/actions"
