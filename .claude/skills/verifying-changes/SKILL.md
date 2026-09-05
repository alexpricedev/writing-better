---
name: verifying-changes
description: How to lint, typecheck, and test this repo before finishing work. Use when you have edited files under src/ and need to confirm the change is sound, when a test or lint command is behaving unexpectedly, or when deciding which command to run for a targeted check.
---

# Verifying changes

Run these through the `package.json` scripts. They set env vars the raw `bun` commands do not.

## The two commands

```bash
bun run check    # biome lint + tsc --noEmit
bun run test     # every *.test.ts / *.test.tsx file under src/
```

`bun run check` is fast and should pass before you consider a change done. `bun run test` is the
behavioural gate. The pre-commit hook runs `bun run build && bun run check`, so a lint or type
error blocks the commit.

## Targeted runs

```bash
bun run test:changed                                      # only tests affected by uncommitted edits
bun run test:file src/server/services/assets.test.ts      # one file
bun run lint:write                                       # apply Biome's safe fixes
bun run typecheck                                        # types only
```

`bun run test:file` takes a path or a directory. Prefer it over `bun test <file>` while iterating.

`bun run test:changed` walks the import graph backwards from your uncommitted diff and runs only
the test files that can see a changed module — the right middle ground between one file and the
full suite while iterating. It is a convenience, not a gate: run the full `bun run test` before
calling a change done, since graph walking can't see dynamic imports.

## Why not `bun test` directly

`bun run test` executes `src/server/test-utils/run-tests.ts`, which:

1. Sets `NODE_ENV=test` before startup — Bun picks its `.env` file from it before any preload
   runs, so nothing later can do this.
2. Runs `bun test --isolate`, so each file gets a fresh global and a clean module registry and a
   mock or mutated global in one file can't leak into the next. One process, one shared transpile
   cache — not one process per file.
3. Kills the run if it exceeds 10 minutes (`TEST_TIMEOUT_MS`) rather than hanging the job. Per-test
   timeouts are Bun's own (`--timeout`, 5s by default).
4. Writes per-file durations to `.timings.json` (`--update-timings`) and prints the ten slowest.
5. Runs the files across worker processes (`--parallel`, one per core). `TEST_WORKERS=1` runs
   serially in one process, which is worth doing when a failure needs a readable, ordered log
   rather than four interleaved ones.

The environment is not the runner's job. `bunfig.toml` preloads `src/server/test-utils/test-env.ts`
into every test file, which pins `APP_URL`, `PORT`, `APP_NAME` and `TRUST_PROXY` — so your `.env`
can't reach a test run whichever command started it.

## Reading failures

- **The whole run reported as timed out** — something is wedged rather than slow: a server or
  socket a test left listening, or an await that never settles. `--isolate` closes most leaked
  handles between files, so this points at the file that was running, not at the suite's length.
- **A test that passes alone and fails in the suite** — module-level state. `rate-limit.ts` holds
  its request log in a module, so a file hitting a rate-limited route needs `clearRateLimitLog()`
  in `beforeEach`.
- **URL or origin assertions failing across many files** — not your `.env`; the preload pins
  `APP_URL` and `PORT`. Check that `test-env.ts` is still first in `bunfig.toml`'s `preload`.

## Browser checks

For user-visible changes, confirm in the browser with the `/browse` skill against
http://localhost:3000. The dev server is already running in another tab — don't start one.

`bun run test:browser` runs `scripts/browser-smoke.test.ts` in a real browser (`Bun.WebView`:
system WebKit on macOS, an installed Chrome elsewhere). It builds the assets, boots its own server
on a scratch port, and covers what happy-dom can't: the client bundle actually executing, CSP not
silently blocking an asset, and the stylesheet actually applying. Deliberately not part of `bun run test` — the API is experimental and the engine varies by
platform, so it must never gate the deterministic suite. Run it after changing
`security-headers.ts`, `layouts.tsx`, the import map, or anything under `src/client/`.
