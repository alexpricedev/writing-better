# Controller tests

Mock the services the controller imports; assert on the real `Response` it returns.

## Shape

```ts
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import type { VisitorStats } from "../../services/analytics";

const mockGetVisitorStats = mock((): VisitorStats => ({
  visitorCount: 1234,
  lastUpdated: "2025-01-01T00:00:00.000Z",
}));
mock.module("../../services/analytics", () => ({
  getVisitorStats: mockGetVisitorStats,
}));

import { statsApi } from "./stats";   // deliberately below the mock

beforeEach(() => {
  mockGetVisitorStats.mockClear();
});

afterAll(() => {
  mock.restore();
});
```

The import sits below executable code on purpose: `mock.module` has to run before the module under
test is evaluated. Don't tidy it.

A controller with no service to mock needs none of this — see `controllers/app/home.test.ts`,
which imports the controller and asserts on the HTML.

## Building requests

`createBunRequest(url, init, params)` from `test-utils/bun-request.ts` returns a `BunRequest`
with `params` and a working `cookies` API. Use `findSetCookie(req, name)` /
`getSetCookieHeaders(req)` to assert on cookies the controller set.

`createMockRequest(url, method, body, headers)` from `test-utils/setup.ts` is the lighter option
when the handler needs neither params nor cookies. A string body is sent verbatim, so a test can
post something malformed; `headers` overrides the JSON default, which is the only way to exercise
the API's media-type guard.

## API controllers

Assert the HTTP contract directly:

```ts
const res = statsApi.index(createMockRequest("http://localhost/api/stats"));
expect(res.status).toBe(200);
await expectJsonResponse(res, { data: stats });
```

Cover the error paths — bad input, missing resource, wrong media type, the rate limit — not just
the happy one. `expectJsonError(res, status, code)` asserts the shared error envelope by `code`,
never by its prose.

Any test that drives a rate-limited route needs `clearRateLimitLog()` in `beforeEach`: the
limiter's log is module-level state shared across every file in the worker.

## View controllers

Render the response body and assert on the HTML:

```ts
const res = home.index();
expect(res.status).toBe(200);
expect(await res.text()).toContain('data-page="home"');
```

For redirects, assert the status and the `Location` header rather than the body:

```ts
expect(res.status).toBe(303);
expect(res.headers.get("Location")).toBe("/");
```
