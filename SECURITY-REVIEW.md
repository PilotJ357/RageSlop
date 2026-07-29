# Security Review — RageSlop

**Scope:** entire repository at `eb0bc26` — the `Five-Of-A-Kind` React/Vite app, its
Dockerfile and compose file, and `.github/workflows/docker-build.yml`.
**Date:** 2026-07-29

## Summary

No high-severity issues and no exploitable vulnerabilities in the shipped application.
The app is a fully client-side dice game: no network calls, no cookies, no auth, no
server, no third-party scripts, and no HTML-injection sinks anywhere in the tree
(no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, or URL sinks).
`npm audit` reports 0 vulnerabilities against the committed lockfile, and no secrets
appear anywhere in the git history.

The findings that matter are all in the CI/CD and packaging layer, where a public repo
with `pull_request` builds and floating action tags carries more supply-chain risk than
the game code itself.

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| 1 | Medium | Actions | Actions pinned to mutable tags, not commit SHAs | Fixed |
| 2 | Medium | Actions | GHCR credentials placed on the runner during untrusted PR builds | Fixed |
| 3 | Low | Actions | `persist-credentials` left at default on checkout | Fixed |
| 4 | Low | Actions | No `concurrency` group — a slow run can overwrite `latest` with a stale image | Fixed |
| 5 | Low | Docker | Base images use floating tags with no digest | Fixed |
| 6 | Low | Docker | No security response headers; nginx version disclosed | Fixed |
| 7 | Low | Docker | nginx master process runs as root | Fixed |
| 8 | Low | Compose | Published on all interfaces, no container hardening | Partly fixed |
| 9 | Low | App | `isValidGameState` does not validate scorecard contents — soft-locks the game | Fixed |
| 10 | Info | Actions | `type=semver` tag rule is dead — no tag trigger exists | Fixed |
| 11 | Info | Docker | `.dockerignore` has no `.env*` rule (Vite inlines `VITE_*` into public JS) | Fixed |
| 12 | Info | App | `Math.random()` for dice — fine here, noted for completeness | No action |

### Fix status notes

All findings were remediated in this branch except as noted below. Test count went from
75 to 119 (`persistence.ts` had no coverage; it now has 44 tests). Typecheck and
production build both pass.

- **Finding 2** was fixed by gating the login step on `github.event_name == 'push'`, not
  by the two-job split the finding suggested. On reflection the split buys almost
  nothing here: fork PRs have their token downgraded to read-only by GitHub regardless
  of the `permissions:` block, and a same-repo PR requires push access — an actor who
  could already push to `main` and trigger the real publish path. The gated login is the
  part that matters, and it keeps the workflow a single readable job.
- **Finding 8** keeps the `0.0.0.0` port binding, since LAN access appears intentional
  for a homelab deployment; the loopback alternative is documented in a comment. The
  container hardening (`read_only`, `cap_drop`, `no-new-privileges`, resource limits)
  was applied.
- **Findings 6, 7, 8** could not be runtime-tested: the review environment has the
  Docker CLI but no daemon. The nginx config and the `read_only` filesystem are
  reasoned-through but unverified — see "Verification performed" for exactly what was
  and was not checked.
- Actions were first pinned within the major already in use, then bumped to the current
  major (checkout v7.0.1, login-action v4.6.0, metadata-action v6.2.0, build-push-action
  v7.3.0). The bump is not cosmetic: the previous majors all target the deprecated
  Node 20 runtime, and the last run's log shows GitHub already force-migrating them —
  `##[warning]Node.js 20 is deprecated. The following actions target Node.js 20 but are
  being forced to run on Node.js 24`. The current majors target Node 24 natively. Only
  the four core inputs are used (`persist-credentials`; `registry`/`username`/`password`;
  `images`/`tags`; `context`/`push`/`tags`/`labels`), all unchanged across these majors.
- Not applied, and worth considering separately: build provenance and SBOM attestations
  (`provenance: true` / `sbom: true` on `build-push-action`), and a vulnerability scan
  step (Trivy/Grype) on the built image. These are additions rather than fixes to a
  flagged defect, so they were left out of the remediation.

## What the repo already gets right

Worth stating, because these are the decisions that keep the severity list short:

- `push: ${{ github.event_name == 'push' }}` — PR builds compile but never publish.
  This is the single most important control in the workflow and it is correct.
- Job-level `permissions:` are explicit and minimal-ish (`contents: read`,
  `packages: write`) rather than relying on the default token scope.
- `pull_request`, not `pull_request_target` — the dangerous variant is avoided.
- Multi-stage Dockerfile: the runtime image contains only `dist` and nginx. No node,
  no npm, no devDependencies, no source in the shipped artifact.
- A committed lockfile, and `npm ci` (not `npm install`) in the build.
- Both storage loaders are wrapped in `try/catch` and validate before trusting
  (`isEntry` in `history.ts` is a correct filter), and all values reach the DOM as React
  text children, so even a tampered store cannot produce script execution.

---

## 1. Actions pinned to mutable tags, not commit SHAs — Medium

`.github/workflows/docker-build.yml:25,28,36,45`

```yaml
- uses: actions/checkout@v4
- uses: docker/login-action@v3
- uses: docker/metadata-action@v5
- uses: docker/build-push-action@v6
```

A git tag is mutable. Whoever controls the action's repo — or anyone who compromises it —
can repoint `v4` at arbitrary code that then runs inside this job with the job's token.
This is not theoretical: it is exactly the mechanism of the `tj-actions/changed-files`
compromise (March 2025), where tags were rewritten to a malicious commit and runner
memory was dumped into build logs across tens of thousands of repositories.

Blast radius here is bounded — the only credential in the job is `GITHUB_TOKEN` — but
that token holds `packages: write`, which is enough to publish a poisoned
`ghcr.io/pilotj357/rageslop:latest` that anyone pulling the image would run.

**Fix.** Pin to full 40-character commit SHAs with the version in a trailing comment:

```yaml
- uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0
```

Then add `.github/dependabot.yml` so the pins still get updated:

```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
  - package-ecosystem: npm
    directory: /Five-Of-A-Kind
    schedule:
      interval: weekly
```

(Verify each SHA against the action's release page before committing — do not copy the
example above on trust.)

## 2. GHCR credentials placed on the runner during untrusted PR builds — Medium

`.github/workflows/docker-build.yml:27-32`

The login step has no `if:`, so it runs on `pull_request` events too, writing a GHCR auth
blob to `~/.docker/config.json` on the runner before the build step compiles code that
came from the pull request. The repository is public with forking enabled, and for
`pull_request` events GitHub runs *the pull request's own copy* of the workflow file — so
a PR can add steps, change the Dockerfile, and change the lockfile that `npm ci` resolves.

Two cases, with different blast radii:

- **Fork PRs.** GitHub downgrades `GITHUB_TOKEN` to read-only and withholds secrets
  regardless of the `permissions:` block, so the credential on disk is not worth stealing.
  The residual risk is compute abuse — arbitrary code execution on a runner, which on
  public repos is free and is routinely abused for cryptomining. The default
  "require approval for first-time contributors" setting is the only gate.
- **Same-repo branch PRs.** The full `permissions:` block applies, so a real
  `packages: write` token sits on the runner while that branch's Dockerfile and
  `package-lock.json` are executed. Low practical risk on a solo repo, but it is the
  reason to gate the step.

**Fix.** One line — the login is only ever needed when the build will actually push:

```yaml
      - name: Log in to GHCR
        if: github.event_name == 'push'
        uses: docker/login-action@<sha> # v3
```

Also worth doing:

- Drop `packages: write` to `packages: read` on PR runs. Cleanest as two jobs
  (a `build` job with `contents: read` only, and a `publish` job gated on
  `github.event_name == 'push'`), or accept the coarser single-job version.
- In **Settings → Actions → General → Fork pull request workflows**, change approval from
  "first-time contributors" to **"Require approval for all external contributors."**

## 3. `persist-credentials` left at default on checkout — Low

`.github/workflows/docker-build.yml:25`

`actions/checkout` writes the `GITHUB_TOKEN` into `.git/config` in the workspace by
default. Impact here is genuinely small — the build runs inside Docker rather than
directly on the runner, and `.dockerignore` excludes `.git` so the token never enters the
build context — but the mitigation is free and removes the token from disk entirely:

```yaml
      - uses: actions/checkout@<sha> # v5
        with:
          persist-credentials: false
```

## 4. No `concurrency` group — Low

Two pushes to `main` in quick succession produce two overlapping runs. If the earlier run
finishes last, it wins the race for the `latest` tag and `latest` ends up pointing at the
older commit — a quiet integrity problem for anything that pulls by tag.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## 5. Base images use floating tags with no digest — Low

`Five-Of-A-Kind/Dockerfile:1,8`

`node:22-alpine` and `nginx:alpine` are mutable. Builds are not reproducible, and you
inherit whatever those tags point at on the day the build runs — including a bad push
upstream. Pin at least the runtime image by digest, and let Dependabot bump it:

```dockerfile
FROM node:22-alpine@sha256:<digest> AS build
...
FROM nginx:1.29-alpine@sha256:<digest>
```

## 6. No security response headers; nginx version disclosed — Low

With no custom config, the image serves via nginx's stock `default.conf`: no
`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, or frame-ancestors restriction, and `server_tokens on` leaks the
nginx version in the `Server` header and on error pages.

Real-world impact on this app is close to nil — there is nothing to steal, no session, and
no injection sink — but the page is fully framable, and headers are the defense-in-depth
that keeps a future bug from mattering. Add `nginx.conf`:

```nginx
server {
    listen 80;
    server_tokens off;
    root /usr/share/nginx/html;

    add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

and `COPY nginx.conf /etc/nginx/conf.d/default.conf` in the runtime stage.

Note `style-src 'unsafe-inline'` is required: the UI styles everything through React
inline `style` props (`App.tsx`, `Die.tsx`, `Scorecard.tsx`, `theme.ts`), so a strict
`style-src` would strip the entire visual design. That is an accepted trade-off, not an
oversight — inline *styles* are a far smaller risk than inline *scripts*, which the policy
above still blocks.

## 7. nginx master process runs as root — Low

The official `nginx:alpine` image starts its master process as root (workers drop to the
`nginx` user). For a container that only serves static files this is unnecessary
privilege. Either switch the base image:

```dockerfile
FROM nginxinc/nginx-unprivileged:1.29-alpine
EXPOSE 8080
```

(listens on 8080, so update the compose mapping to `"5801:8080"`), or keep nginx and drop
privileges in compose as shown next.

## 8. Compose file has no hardening — Low

`Five-Of-A-Kind/compose.yaml`

`"5801:80"` binds to `0.0.0.0`, so the game is reachable from every host on the LAN, not
just the Docker host. On a homelab box that may well be deliberate — if it is, ignore this.
If the game is meant to be host-only, bind the loopback explicitly. Either way, the
container has no resource limits, no capability drops, and a writable root filesystem:

```yaml
services:
  five-of-a-kind:
    build: .
    ports:
      - "127.0.0.1:5801:80"   # drop the prefix if LAN access is intended
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /var/cache/nginx
      - /var/run
    cap_drop: [ALL]
    cap_add: [CHOWN, SETUID, SETGID]   # not needed with nginx-unprivileged
    security_opt:
      - no-new-privileges:true
    mem_limit: 128m
    pids_limit: 64
```

## 9. `isValidGameState` does not validate scorecard contents — Low

`Five-Of-A-Kind/src/game/persistence.ts:20-24`

```ts
if (typeof obj.scorecard !== 'object' || obj.scorecard === null) return false;
const sc = obj.scorecard as Record<string, unknown>;
if (typeof sc.scores !== 'object' || sc.scores === null) return false;
if (typeof sc.bonusCount !== 'number' || sc.bonusCount < 0) return false;
```

Every other field gets a real check — `dice` is verified to be five values in 1..6, `held`
to be five booleans, `phase` against an allowlist. `scores` is only checked to be a
non-null object. It is never checked that the 13 categories are present, that their values
are `number | null`, or that `bonusCount` has an upper bound. The function's whole job is
to be the trust boundary for untrusted stored data, and for this one field it stops short.

This is a robustness/data-integrity bug, not a privilege boundary: the only writer to
`localStorage` on this origin is the user themselves. It is listed because the validator is
already trying to do this and the gap produces a real broken state. Verified against the
actual modules:

- **`scores: {}` soft-locks the game.** Every lookup returns `undefined`. `isOpen`
  compares `=== null`, so no category reads as open, `legalCategories` returns `[]`, and
  `commit` returns the state unchanged for all 13 categories — the player can roll forever
  and never score. The scorecard renders every row as filled, struck through, displaying
  the literal string `undefined`. Only the **New** button escapes.
- **A string score corrupts the total.** `grandTotal`'s `(scores[c] ?? 0)` reduce
  concatenates instead of adding: a scorecard with `ones: "PWNED"` yields the grand total
  `"0PWNED00000000"`, which is then rendered in the TOTAL row.
- **`bonusCount` has a lower bound but no upper one.** `1e308` makes `grandTotal` return
  `Infinity`.

(The corrupt-total case is self-limiting: if such a game reaches `gameOver`, the bad value
is written to history, but `isEntry` rejects a non-numeric `score` on the next load, so the
history heals itself on reload.)

**Fix.** Finish the check:

```ts
const scores = sc.scores as Record<string, unknown>;
const validScore = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v));
if (!ALL_CATEGORIES.every((c) => c in scores && validScore(scores[c]))) return false;
if (!Number.isInteger(sc.bonusCount) || sc.bonusCount < 0 || sc.bonusCount > TOTAL_ROUNDS) return false;
```

`ALL_CATEGORIES` and `TOTAL_ROUNDS` are already exported from `./types`. Worth a unit test
alongside the existing 75 — the current suite does not cover `persistence.ts` at all.

## 10. `type=semver` tag rule is dead — Informational

`.github/workflows/docker-build.yml:40`

`type=semver,pattern={{version}}` only produces a tag on a `refs/tags/*` push, but the
`push:` trigger is filtered to `branches: [main]` and has no `tags:` entry. Pushing
`v1.0.0` today runs no workflow at all and publishes no image. Not a security issue, but a
release would silently fail to build. If versioned releases are wanted:

```yaml
on:
  push:
    branches: [main]
    tags: ['v*.*.*']
```

## 11. `.dockerignore` has no `.env*` rule — Informational

`Five-Of-A-Kind/.dockerignore`

The current list is good and covers what exists today. The forward-looking gap: Vite reads
`.env` files at build time and **inlines every `VITE_`-prefixed variable into the public
JavaScript bundle**. There is no `.env` in the repo now, but if one is ever added it would
be copied by `COPY . .` into the build stage and its `VITE_*` values baked into `dist/` —
which ships in the image and is served to every visitor. Cheap prevention:

```
.env
.env.*
*.pem
*.key
```

The general rule for any static SPA: nothing secret can live in the frontend build, and
`VITE_`-prefixed is a public prefix, not a private one.

## 12. `Math.random()` for dice — Informational, no action

`Five-Of-A-Kind/src/game/scoring.ts:189-190`

`Math.random()` is not cryptographically secure — V8's xorshift128+ state is recoverable
from a handful of outputs, so future rolls are predictable. For a single-player local game
with no stakes and no server-side score validation, this is the right choice and I would
not change it. It would only matter if scores ever became competitive or server-verified.

The implementation itself is sound: `Math.min(6, 1 + Math.floor(rng() * 6)) || 1` is
uniform over 1..6, clamps a hypothetical `rng() === 1`, and the `|| 1` guards `NaN`.

---

## Verification performed

- Read every source, config, and workflow file in the repository (28 files).
- `npm audit` against the committed lockfile — **0 vulnerabilities**. Resolved versions are
  current: react 19.2.8, vite 6.4.3, vitest 3.2.7, esbuild 0.25.12.
- Grepped all 73 objects in git history for credential patterns (API keys, GitHub PATs,
  AWS keys, Slack tokens, private key blocks) — **no secrets found**. The only matches were
  `${{ secrets.GITHUB_TOKEN }}` references and the `js-tokens` npm package name.
- Grepped the source for injection sinks and egress (`dangerouslySetInnerHTML`, `innerHTML`,
  `eval`, `new Function`, `document.write`, `insertAdjacentHTML`, `fetch`, `XMLHttpRequest`,
  `postMessage`, `document.cookie`) — **no matches**. The only storage/IO in the app is the
  four `localStorage` calls in `persistence.ts` and `history.ts`.
- Confirmed repository state via the GitHub API: **public**, forking enabled, 0 forks,
  default branch `main`, 5 workflow runs — all `push` on `main`, all successful, no
  `pull_request` runs yet.
- Wrote and ran a throwaway vitest suite against the real modules to confirm each claim in
  finding 9 (soft-lock, string total, `Infinity`) rather than inferring it. Those cases
  are now permanent tests in `src/game/persistence.test.ts`.

### Verified after the fixes

- `npm test` — 119/119 pass. `npx tsc -b` — clean. `npm run build` — succeeds.
- Checked the CSP against the actual build output rather than assuming: `dist/index.html`
  emits no inline `<script>` and no inline `<style>`, only a same-origin module script and
  a same-origin stylesheet. `script-src 'self'` and `style-src 'self'` are therefore
  satisfied by the bundle, and `'unsafe-inline'` is needed solely for the runtime React
  `style` attributes.
- Parsed all three YAML files and asserted the resulting structure — triggers, job
  permissions, and the `if:` condition on the login step.
- Resolved every action SHA and both image digests from upstream at review time
  (`git ls-remote` for the actions, the Docker Hub registry API for the images). None
  were written from memory.

### Not verified

- **The container was never built or run.** The review environment has the Docker CLI but
  no daemon, so `nginx.conf` syntax, the unprivileged base image swap, and the
  `read_only: true` filesystem are reasoned-through but untested. `read_only` is the
  likeliest to bite: nginx needs writable `/tmp` (its pid file) and `/var/cache/nginx`,
  both provided as tmpfs. If the container fails to start, drop `read_only` and `tmpfs`
  from `compose.yaml` — everything else is independent of it.
- GHCR package visibility could not be changed programmatically; see the note in the
  handover for why, and for the UI steps.

## Suggested order of work

1. Finding 2 — add `if: github.event_name == 'push'` to the login step. One line.
2. Finding 1 — SHA-pin the four actions, add `dependabot.yml`.
3. Finding 9 — finish the `scores` validation, add a `persistence.ts` test.
4. Findings 5, 6, 7 — pin base images, add `nginx.conf`, drop root.
5. Findings 3, 4, 8, 11 — cheap one-liners, batch them together.
