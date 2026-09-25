# Security policy

## Supported versions

Only the latest release gets fixes. The `v1` tag always points at it, so workflows that use `qwerty-ll/CustomizeYouProfile@v1` pick up a fix on their next run.

## Reporting a vulnerability

Please report it privately through GitHub's [Report a vulnerability](https://github.com/qwerty-ll/CustomizeYouProfile/security/advisories/new) form, not in a public issue. Say what an attacker could do and how to reproduce it, and never include real tokens. If the form isn't available, open an issue that only asks for a private contact, without details.

## How it's built

### The action

- The workflow gets `contents: write` on your profile repository and nothing else.
- The token (`github.token`, or your own) is sent only to `api.github.com`.
- Inputs reach the scripts as environment variables and are passed on as quoted arguments; they are never interpolated into shell code.
- Only public repositories are read, so the names and languages of private ones can't end up in an image.
- Everything you type is escaped before it goes into an SVG, and the avatar is embedded only as a plain PNG, JPEG, GIF or WebP data URI of at most 512 KB. GitHub shows README images through `<img>`, where scripts don't run anyway.
- The images are public. If `name`, `tagline`, `skills` or `countdown` looks like it contains a GitHub token, the run stops before anything is generated.
- GitHub evaluates `${{ … }}` expressions in `with:` values before the action starts, so `${{ github.token }}` typed into a tagline would put the token into a public image. The configurator and the installer defuse `${{` in your text, and the token check above catches anything that still gets through.

### The installer

`install.sh` uses your logged-in GitHub CLI, accepts only known effect ids, writes your text into the workflow as quoted YAML, and won't replace a `profile-effects.yml` that isn't from this project unless you pass `FORCE=1`.

### The configurator

- It runs entirely in your browser: no token, no login, no backend. It reads public data from the GitHub API, and the contribution calendar from the third-party mirror [github-contributions-api.jogruber.de](https://github.com/grubersjoe/github-contributions-api), since GitHub has no token-free API for it. That service therefore sees the usernames you preview.
- If the mirror is down or goes away, the preview shows your real profile with a sample graph. The action never uses it; it reads your data from GitHub's own API.
- Data from the mirror is validated before use, and a Content-Security-Policy lets the page run only its own scripts and connect only to GitHub and the mirror.
- Your settings and recent lookups (the last 5 users, for an hour) are kept only in your browser's local storage.

## Pinning a version

`@v1` follows new releases automatically. To review every change before it runs in your repository, pin a full commit SHA instead:

```yaml
- uses: qwerty-ll/CustomizeYouProfile@<commit sha>
```
