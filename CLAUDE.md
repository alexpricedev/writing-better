# CLAUDE.md

Writing Better is a server-rendered TypeScript app on Bun. There is **no database, no accounts,
and no server-side user data** — the app is anonymous, and everything a person writes stays in
their own browser. Requests flow route → controller → template. `README.md` has the directory
tree; the code is the spec for everything else. This file is for the things you can't learn by
reading the repo.

## Working agreements

- The dev server is already running in another tab, on this workspace's own port — don't start
  one, and don't add a second. `bun run dev` here will fail on the port or fight the watcher.
  Read `PORT` from `.env` rather than assuming 3000; only the root checkout is on 3000.
- Run test and lint suites through the `package.json` scripts (`bun run test`, `bun run check`).
  See the `verifying-changes` skill.
- Write code that reads like the surrounding code: match its comment density, naming, and idiom.
- When you try several approaches to a problem, delete the ones you abandoned before you finish.
- Check work in the browser with the `/browse` skill when the change is user-visible.
- Never `git stash`. Use `bun run wip` — see "The stash is shared, the worktrees are not".

## Gotchas

### Persistence is the browser's, not the server's

The server holds no per-visitor state: no sessions, no cookies beyond what the platform sets, no
tables. A feature that needs to remember something remembers it client-side (`localStorage`,
IndexedDB) in `src/client/`, and the server's job is to ship the page that runs it.

Two consequences worth stating before you design anything:

- **There is no cross-device sync and no server-side recovery.** Clearing site data loses the
  work. Anything the user would grieve losing needs an explicit export, not a promise of
  durability.
- **Adding a server-side store is a decision, not a refactor.** It brings back the whole surface
  this app deliberately doesn't have — accounts, a privacy policy for stored content, backups,
  a deletion path. Say so before you start rather than after.

There is likewise no CSRF machinery, because there is nothing to forge a request against. A route
that mutates server state would need one; adding such a route means adding the check with it.

### The stash is shared, the worktrees are not

This repo is usually several worktrees over one shared `.git`, and `refs/stash` lives in the
shared part — one global stack, so an agent that pops can silently take another agent's work.
`bun run wip` (`scripts/wip`) is the replacement: it snapshots to `refs/worktree/wip`, the one ref
namespace git keeps per-worktree. Run it bare for the subcommand list (`save`, `stash`, `list`,
`show`, `restore`, `drop`); `restore` applies without dropping, and untracked files are never
touched. A `PreToolUse` hook denies `git stash` and prints that same table; `git stash create` and
anything naming `refs/worktree/` pass through — that is how `scripts/wip` works.

### Each workspace owns its port

`scripts/workspace.ts provision` (run by Conductor setup) rewrites this workspace's `.env` —
`PORT` and `APP_URL` from `CONDUCTOR_PORT` — so two agents running `bun run dev` don't fight over
one port. A workspace port must never reach the tests: they hardcode `http://localhost:3000` and
build expected URLs from `APP_URL`, which is why `test-env.ts` pins both. `provision` is
idempotent and no-ops in cloud workspaces.

### One JSX runtime, two execution models

Everything compiles with Preact (`jsxImportSource: preact` in `tsconfig.json`) — there is no React
in this project. What differs is *when* the JSX runs, and the `src/server/` vs `src/client/` split
is the signal:

- **`src/server/`** renders once through `renderToString()` from `preact-render-to-string` and ships
  as HTML. It never hydrates, so `useState` in a server template does nothing.
- **`src/client/`** mounts into the live DOM with `render()` from `preact` and is fully interactive.

`preact` is a runtime **dependency**, not a devDependency — the server imports its JSX runtime, so a
production install without it won't boot. The client bundle marks it `--external` and resolves it
from the import map in `src/server/components/layouts.tsx`, so the version pinned there must stay in
step with `package.json`.

The import map carries **both** `preact/jsx-runtime` and `preact/jsx-dev-runtime`, and both are
`--external` in the client build. Neither is dead weight. Bun 1.4 documents `"jsx": "react-jsx"` as
emitting `jsx` from `<pkg>/jsx-runtime`, but the mere presence of a `bunfig.toml` — any content, even
empty — makes it emit `jsxDEV` from `<pkg>/jsx-dev-runtime` instead. This repo has one, so the
bundle and the server both use the dev runtime. Reproduce it by deleting `bunfig.toml` and
rebuilding; the import changes. Whichever way Bun settles this, both entries are mapped, so nothing
breaks — which is the only reason it isn't a live bug here. Don't prune the "unused" one.

**Write SVG attributes in kebab-case** (`stroke-width`, not `strokeWidth`). Preact passes camelCase
attribute names through verbatim, and the HTML parser doesn't recognise `strokeWidth` — the stroke
silently renders at the default width. React used to rewrite these; nothing does now.

No Web Components. Shadow DOM and custom-element lifecycles need browser infrastructure to test;
pure functions and Preact islands are both testable under `bun:test`.

### The test runner is a script, not `bun test`

`bun run test` runs `src/server/test-utils/run-tests.ts` for the one thing `bun test` won't do
itself: set `NODE_ENV=test` (Bun picks its `.env` file from it before any preload runs).
Isolation is `bun test --isolate`'s job — fresh globals and module registries per file, one shared
transpile cache — and `--parallel` runs one worker per core. `TEST_WORKERS=1` when a failure needs
a readable, ordered log.

Module-level state is the hazard isolation doesn't excuse: `rate-limit.ts`'s `requestLog` Map is
shared by every file in a process, so a file exercising a rate-limited route must call
`clearRateLimitLog()` in `beforeEach` or it passes alone and fails after any file that drove the
limiter to 429.

`run-tests.ts` sweeps only the paths in its `TEST_PATHS`, which is `["src"]`. A test under
`scripts/` never runs in CI unless it is named there — `scripts/browser-smoke.test.ts` is
deliberately out, because it needs a built bundle and a listening server, and runs through
`bun run test:browser`. Add opted-in files by name; a widened glob would drag the smoke test in.

### One preload sets the test environment

`bunfig.toml` preloads `src/server/test-utils/test-env.ts`, which pins the whole test environment
(`PORT`, `APP_URL`, `APP_NAME`, `TRUST_PROXY`), and `src/client/test-utils/setup.ts`, which
registers happy-dom globals and then restores Bun's native `Request`/`Response`/`FormData` — but
**not** `fetch`: happy-dom's fetch stays installed and enforces the Same-Origin Policy, so a test
that needs real network must use `Bun.fetch`.

A preload is the only place early enough: imports are hoisted above a file's body, so a value a
module captured at import time is already read before a test's first line runs. There is no
`.env.test` — nothing in the suite varies by machine any more.

### An uncaught throw in an API controller becomes an *HTML* 500

`handleGuarded` catches everything and answers with `render500()` — the styled HTML error page —
whatever the route was. So a bare `await req.json()` on a malformed body sends an error page to a
JSON client and logs the request as a server fault, for what was the caller's typo.

`src/server/controllers/api/request-guard.ts` is the fix, and every `/api` controller opens with
it: `readJsonBody` (415 on the wrong `Content-Type`, 400 on unparseable or non-object),
`readIdParam`, `readPagination`, and `apiReadLimit` / `apiWriteLimit`. Errors go through
`jsonError` in `utils/response.ts` — one `{ error: { code, message } }` envelope, shared with the
rate limiter, with a stable `code` and a `message` no test should assert on.

API routes use `createApiRouteHandler`, not `createRouteHandler` — same method dispatch, JSON 405.
Both send `Allow`. Use it even for a one-method resource: a bare handler in a Bun routes map
answers *every* method.

### Env is validated at boot and `APP_URL` is load-bearing

`validateEnv()` exits the process before `Bun.serve()` on a missing var. Three are required:
`PORT`, `APP_NAME`, `APP_URL`.

`APP_URL` must include the port. It is the origin every absolute link is built from
(`utils/app-url.ts`), never the request's `Host` header, which the client controls.

### Security headers and CSP are centralised

Every response gets its headers from `secureRoutes` / `handleGuarded` in
`src/server/utils/security-headers.ts`. Controllers set only content-specific headers.

The CSP script allowlist is `'self' 'unsafe-inline' https://esm.sh` — esm.sh serves Preact to the
import map. Any new third-party script needs the CSP entry, an SRI `integrity` hash, and ideally a
`preconnect` in `layouts.tsx` — otherwise it is silently blocked in the browser but passes every
test.

### Assets are only fingerprinted in production

`initAssets()` and `getAssetUrl()` no-op unless `NODE_ENV=production`, so asset URLs differ between
dev and prod. In production the files must already exist in `dist/assets` or startup throws.

The un-hashed dev bundle is served by `serveDevBundle` (`src/server/utils/static-files.ts`), not
`serveFile`, and that distinction is load-bearing. `bun build --watch` rewrites `dist/assets/*` in
place, so a reload can read the file mid-write; `serveFile` would stream those zero bytes as a 200
carrying `max-age=3600`, and the stylesheet would stay missing for an hour. `serveDevBundle` reads
the whole file into memory, answers an empty read with a 503 + `Retry-After`, and sets `no-store`
throughout — so a mid-rebuild request costs one reload, never a cached blank.

A bundle that is *absent* rather than empty gets the same 503, not a 404: `handleFallback` checks
the name against `BUNDLE_FILENAMES` (`src/server/services/assets.ts`), so `/assets/main.css` with
no build behind it reads as build state the next `bun run build` fixes, while `/assets/typo.js`
stays a 404. `warnOnMissingDevBundles()` says the same thing at boot, and `bun run dev` builds once
before starting the watchers.

Anything that reads or writes `dist/assets` in a test must call `setAssetsDirForTest()` first.
`assets.test.ts` used to build its fixtures in the real `dist/assets` and `rmSync` the whole
directory in `afterAll` — running that one file (an editor's test button) deleted the running dev
server's bundles, and every page went unstyled until someone ran `bun run build`. Every read of the
directory goes through `assetsDir()` (`initAssets`, `handleAssetRequest`, `warnOnMissingDevBundles`,
and `handleFallback`) so the override covers all of them; pass `null` in an `afterEach`/`finally` to
restore it. It is deliberately not an env var — `--outdir ./dist/assets` is fixed in
`package.json`, so pointing a deployment somewhere else would only break boot.

### The upstream release is in `.billet-version`, not `package.json`

This tree started as a fork of Billet, and `package.json`'s `version` is now this project's.
`.billet-version` is the separate, rename-proof record of which Billet release the tree came from:
one version line, everything else comment.

Its value has narrowed since the fork — the auth, teams, and database layers Billet ships were
removed here, so most upstream fixes no longer apply. It is still the cheapest way to answer
"was this already fixed upstream?" for the code that remains: `git log <tag>..HEAD -- <path>`.
The file's comment carries the `curl` commands for upstream's tags and CHANGELOG.

### Linting

Biome runs with `recommended` on and `noConsole: error` — use `log` from
`src/server/services/logger.ts` in server code. Test files, `logger.ts`, and the CLI scripts have
targeted overrides in `biome.json`; add an override there rather than sprinkling ignore comments.

### Naming that isn't inferable

App controllers export a plain name (`home`); API controllers use an `Api` suffix (`statsApi`) so
both can be barrel-exported when they share a resource name.

## Skills

Detail lives in skills so it loads only when it's relevant:

- `adding-a-feature` — wiring a new page or API endpoint through every layer
- `writing-tests` — the testing pattern for each module type
- `verifying-changes` — how to run checks and tests, and what the failures mean

## Runbooks

`runbooks/` holds the operational standards this project is held to — `SECURITY.md`,
`PRIVACY.md`, `ACCESSIBILITY.md`, `SEO.md`, `CI.md`. Read the relevant one before changing
headers, cookies, metadata, or anything a visitor's browser stores.
