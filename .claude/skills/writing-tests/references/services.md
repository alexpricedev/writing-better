# Service and middleware tests

Services here are pure: they read the environment and compute, and none of them talk to a
database — there isn't one. So most service tests need no fixture at all beyond the module
itself.

## Shape

```ts
import { describe, expect, test } from "bun:test";
import { buildRobotsTxt, SITE_URL } from "./seo";

describe("buildRobotsTxt", () => {
  test("points crawlers at the absolute sitemap URL", () => {
    expect(buildRobotsTxt()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});
```

Two things worth keeping to:

- **Mock only what reaches outside the module.** `mock.module` has to run before the module under
  test is evaluated, so when a service does need a mocked dependency, the import of the service
  sits *below* the mock. That ordering is intentional wherever you see it; leave it.
- **Restore in `afterAll`.** A file that calls `mock.module` needs `mock.restore()`, or its mock
  outlives it in the same worker.

## Environment-dependent services

Several services read `process.env` on every call so a test can flip a value mid-file —
`security-txt.ts` on `SECURITY_CONTACT`, `assets.ts` on `NODE_ENV`. Set the variable inside the
test and restore it in a `finally` or `afterEach`; the preload's value is what every other file
expects to see.

Anything that reads or writes `dist/assets` must call `setAssetsDirForTest()` first and pass
`null` afterwards — see CLAUDE.md for the incident that rule comes from.

## What to cover

The output contract and the branches: a missing optional env var, a production-only code path, the
error case. There is no database to enforce anything for you, so a constraint you care about is a
constraint you assert.

## Middleware

Middleware in `src/server/middleware/` returns `Response | null` — a `Response` means "stop, this
is the answer", `null` means "carry on". Assert both branches.

`rate-limit.ts` keeps its request log in a module-level Map shared by every file in a worker
process, so any test that drives a rate-limited route must call `clearRateLimitLog()` in
`beforeEach`. Without it the file passes alone and fails after any file that pushed the limiter
to 429.
