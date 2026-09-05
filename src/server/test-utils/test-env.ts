// The one place test environment variables are set.
//
// `bunfig.toml` preloads this for every test file, and a preload module runs
// before the test file's own module graph is evaluated. That is what makes it
// the only workable place: ESM hoists a file's imports above the first line of
// its body, so a test that assigns an environment variable at the top of the
// file is already too late for anything a module captured as it was imported.
//
// Preload also means these values hold however the suite is started: `bun run
// test`, `test:file`, `test:coverage`, or an editor's run-test button. The
// alternative — a runner that spawns each file with an env of its own — only
// covers the one entry point, and Bun loads the developer's `.env` for the
// others, which is exactly the leak this prevents.

// Assigned, not defaulted. A developer with different values in `.env` has
// them loaded by the time this runs, and deferring to that would reintroduce
// the leak. Tests that exercise a non-default set the variable per case at
// runtime, which happens long after preload.
const TEST_ENV: Record<string, string> = {
  // Tests build request URLs as http://localhost:3000. Pinned rather than
  // inherited so a workspace's own port can't reach the suite.
  PORT: "3000",
  APP_URL: "http://localhost:3000",

  APP_NAME: "Test App",

  TRUST_PROXY: "false",
};

for (const [key, value] of Object.entries(TEST_ENV)) {
  process.env[key] = value;
}
