/* biome-ignore-all lint/suspicious/noConsole: CLI script */

// The test entry point. It exists for the one thing `bun test` won't do itself:
// set NODE_ENV before startup. Bun picks which `.env` file to load from it, so
// it cannot be set from `test-env.ts` with the rest of the suite's environment.
//
// Isolation is `bun test --isolate`'s job, not this script's. It gives each
// file a fresh `globalThis` and clears the ESM and CommonJS module registries
// between files, then adds what that couldn't: closing servers, sockets and
// watchers a file leaked, cancelling its timers, restoring fake timers, and
// re-running the preloads in the new global. Transpiled source is cached across
// files, so the suite parses each module once rather than once per file.

import { cpus } from "node:os";

const TIMINGS_FILE = process.env.TEST_TIMINGS_FILE ?? ".timings.json";

// A whole-run hang detector, not a speed limit. Per-test timeouts are Bun's
// (`--timeout`, 5s by default), and `--isolate` closes the handles that used to
// wedge a run, so this only catches a run that stops making progress
// altogether. Generous by default; CI raises it because a runner is slower.
const TIMEOUT_MS = Number.parseInt(process.env.TEST_TIMEOUT_MS ?? "600000", 10);

const SLOWEST_TO_REPORT = 10;

// The paths `bun test` sweeps, named rather than globbed. `scripts/` is not in
// the list: `scripts/browser-smoke.test.ts` needs a built bundle and a
// listening server, so it runs on its own through `bun run test:browser`. Any
// other test outside `src/` has to be added here by name or it never runs in
// CI, and nothing will tell you — a widened glob would drag the smoke test in
// with it.
const TEST_PATHS = ["src"];

// One worker per core by default. `TEST_WORKERS=1` runs the suite in a single
// process, which is the right setting when a failure needs a readable, ordered
// log.
const WORKERS = Math.max(
  1,
  Number.parseInt(process.env.TEST_WORKERS ?? String(cpus().length), 10) || 1,
);

// `--update-timings` records how long each file took, slowest first. That is
// the report printed below, and it is what `--shard` and `--parallel` read to
// balance by wall time rather than file count.
const tests = Bun.spawn(
  [
    "bun",
    "test",
    // `--parallel` implies `--isolate`; passing it explicitly keeps the
    // single-worker case isolated too.
    "--isolate",
    ...(WORKERS > 1 ? [`--parallel=${WORKERS}`] : []),
    "--no-coverage",
    `--timings=${TIMINGS_FILE}`,
    "--update-timings",
    ...TEST_PATHS,
  ],
  {
    env: { ...process.env, NODE_ENV: "test" },
    // Inherited, not piped: Bun's own reporter is better than anything this
    // script could scrape out of it, and a long suite should print as it goes
    // rather than in one dump at the end.
    stdout: "inherit",
    stderr: "inherit",
  },
);

let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  tests.kill();
}, TIMEOUT_MS);

const exitCode = await tests.exited;
clearTimeout(timer);

if (timedOut) {
  console.error(
    `\nTest run exceeded ${Math.round(TIMEOUT_MS / 1000)}s and was killed. ` +
      "Set TEST_TIMEOUT_MS to raise the cap.",
  );
  process.exit(1);
}

type Timings = { files?: Record<string, number> };

const reportSlowest = async (): Promise<void> => {
  const file = Bun.file(TIMINGS_FILE);
  if (!(await file.exists())) return;

  let timings: Timings;
  try {
    timings = (await file.json()) as Timings;
  } catch {
    return;
  }

  const entries = Object.entries(timings.files ?? {}).slice(
    0,
    SLOWEST_TO_REPORT,
  );
  if (entries.length === 0) return;

  console.log("\nSlowest files:");
  for (const [path, ms] of entries) {
    console.log(`  ${String(ms).padStart(6)}ms  ${path}`);
  }
};

await reportSlowest();

process.exit(exitCode);
