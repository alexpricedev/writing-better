import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Subprocess } from "bun";

// Real-browser smoke tests, run via `bun run test:browser` — deliberately NOT
// part of `bun run test`, which globs `src` only. Bun.WebView is experimental
// and the engine differs by platform (system WebKit on macOS, an installed
// Chrome elsewhere), so these journeys must never gate the deterministic
// suite. What they cover is exactly what happy-dom can't:
//
// - the client bundle executing in a real page (not just parsing)
// - CSP: a blocked script passes every unit test and fails only here
// - the stylesheet actually applying
//
// The server is a real subprocess, so this also exercises boot (env
// validation, asset warnings) and — on teardown — the SIGTERM drain.

const PORT = 3987;
const BASE = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = "/tmp/writing-better-browser-smoke";

let server: Subprocess;
let view: InstanceType<typeof Bun.WebView>;

// Every page-side console.error lands here; the last test asserts the run was
// clean. CSP violations report through the page console, which is the whole
// reason to collect them.
const pageErrors: string[] = [];

/** Poll `fn` until `pred` accepts its result or the deadline passes. */
const until = async <T>(
  fn: () => Promise<T>,
  pred: (value: T) => boolean,
  ms = 10_000,
): Promise<T> => {
  const deadline = Date.now() + ms;
  let last = await fn();
  while (!pred(last) && Date.now() < deadline) {
    await Bun.sleep(100);
    last = await fn();
  }
  return last;
};

beforeAll(async () => {
  // The child gets its own port and matching APP_URL. Everything else is
  // inherited from the pinned test environment.
  server = Bun.spawn(["bun", "src/server/main.ts"], {
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(PORT),
      APP_URL: BASE,
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  // Bun.fetch, not fetch: the happy-dom preload replaces global fetch with
  // one that enforces the Same Origin Policy against its fake window.
  const ready = await until(
    () =>
      Bun.fetch(BASE)
        .then((res) => res.ok)
        .catch(() => false),
    (ok) => ok === true,
    15_000,
  );
  if (!ready) throw new Error(`Server did not answer on ${BASE}`);

  view = new Bun.WebView({
    width: 1280,
    height: 900,
    console: (type, ...args) => {
      if (type === "error") pageErrors.push(args.map(String).join(" "));
    },
  });
});

afterAll(async () => {
  view?.close();
  // SIGTERM, not kill(): teardown doubles as a live check of the graceful
  // shutdown handler. A hang here means the drain regressed.
  server?.kill("SIGTERM");
  await server?.exited;
});

describe("browser smoke", () => {
  test("home renders with a title and an applied stylesheet", async () => {
    await view.navigate(`${BASE}/`);

    const title = await view.evaluate<string>("document.title");
    expect(title.length).toBeGreaterThan(0);

    // A missing or CSP-blocked stylesheet leaves styleSheets empty while the
    // HTML still renders — the classic "passes every test, unstyled in prod".
    const styleSheets = await view.evaluate<number>(
      "document.styleSheets.length",
    );
    expect(styleSheets).toBeGreaterThan(0);
  });

  test("the client bundle runs and enhances the nav", async () => {
    await view.navigate(`${BASE}/`);

    // Set only by src/client/components/nav-menu.ts at init — proves main.js
    // was served, passed CSP, and executed.
    const enhanced = await until(
      () =>
        view.evaluate<boolean>(
          `document.querySelector('[data-component="nav"]')?.dataset.navEnhanced !== undefined`,
        ),
      (value) => value === true,
    );
    expect(enhanced).toBe(true);

    const { mkdirSync } = await import("node:fs");
    mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await Bun.write(`${SCREENSHOT_DIR}/home.png`, await view.screenshot());
  });

  test("an unknown path renders the 404 page", async () => {
    await view.navigate(`${BASE}/does-not-exist`);

    const text = await view.evaluate<string>("document.body.innerText");
    expect(text).toContain("404");
  });

  test("no page threw or hit a CSP violation across the run", () => {
    expect(pageErrors).toEqual([]);
  });
});
