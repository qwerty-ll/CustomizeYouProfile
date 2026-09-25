#!/usr/bin/env bash
# Runs install.sh against a stub `gh` and checks the workflow it would upload.
# Only bash 3.2 features and POSIX tools, so CI also runs it on the bash
# version macOS ships.
#   bash test/install.test.sh      (INSTALL_BASH=/path/to/bash picks another bash for install.sh)
# shellcheck disable=SC2016  # the '$(x)' and '${{' below are meant literally

set -u
BASH_UNDER_TEST="${INSTALL_BASH:-$BASH}"
ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# The stub answers what install.sh asks: logged in as "mona", the profile
# repository exists, no workflow yet. The uploaded file lands in $TMP/upload.
cat > "$TMP/gh" <<'STUB'
#!/bin/sh
case "$1 $2" in
  "auth status" | "repo view" | "workflow run") exit 0 ;;
  "api user") echo mona; exit 0 ;;
esac
for a in "$@"; do case "$a" in content=*) printf '%s' "${a#content=}" > "$STUB_DIR/upload" ;; esac; done
case " $* " in *" -X PUT "*) exit 0 ;; esac
echo '{"message":"Not Found"}'; exit 1
STUB
chmod +x "$TMP/gh"

fails=0
fail() { echo "FAIL: $*"; fails=$((fails + 1)); }
# install <effects> [VAR=value…]: runs the installer, decodes the upload into $TMP/workflow.yml
install() {
  local effects="$1" status
  shift
  rm -f "$TMP/upload" "$TMP/workflow.yml"
  env PATH="$TMP:$PATH" STUB_DIR="$TMP" "$@" "$BASH_UNDER_TEST" "$ROOT/install.sh" "$effects" > "$TMP/log" 2>&1
  status=$?
  if [ -f "$TMP/upload" ]; then base64 -d < "$TMP/upload" > "$TMP/workflow.yml"; else : > "$TMP/workflow.yml"; fi
  return $status
}
has() { grep -qxF -- "$2" "$TMP/workflow.yml" || fail "$1: missing line: $2"; }
lacks() { if grep -qF -- "$2" "$TMP/workflow.yml"; then fail "$1: unexpected: $2"; fi; }

install "intro, dino-run" CYP_LANGUAGE=ru CYP_NAME='Ma"k \ $(x) ${{ github.token }}' CYP_TAGLINE="$(printf 'one\ntwo')" \
  || fail "settings: exit $? $(cat "$TMP/log")"
has settings '      - uses: qwerty-ll/CustomizeYouProfile@v1'
has settings '          effects: intro, dino-run'
has settings '          language: "ru"'
has settings '          name: "Ma\"k \\ $(x) $ {{ github.token }}"'
has settings '          tagline: "one two"'
lacks settings '${{'

# WSL sets NAME, locales set LANGUAGE: neither may leak into the profile
install dino-run NAME=DESKTOP-4F2K9QX LANGUAGE=de_DE:de TAGLINE="older docs" || fail "system variables: exit $?"
lacks "system variables" '          name:'
lacks "system variables" '          language:'
has "older docs" '          tagline: "older docs"'

install all || fail "all: exit $?"
has all '          effects: all'

if install 'dino-run,*'; then fail "an unknown effect was accepted"; fi
[ -s "$TMP/workflow.yml" ] && fail "a workflow was uploaded for an unknown effect"

if [ "$fails" -gt 0 ]; then
  echo "install.sh: $fails check(s) failed ($("$BASH_UNDER_TEST" -c 'echo bash $BASH_VERSION'))"
  exit 1
fi
echo "ok: install.sh ($("$BASH_UNDER_TEST" -c 'echo bash $BASH_VERSION'))"
