# Security Features

Writing Better has no accounts, no sessions, and no database. That removes most of the classic
web application attack surface rather than defending it: there are no credentials to steal, no
session to fixate or ride, and no query to inject. What remains is the HTTP surface and the
browser, and that is what this document covers.

## What the absence of state means

- **No CSRF machinery.** CSRF defends server-side state changes made on a visitor's behalf.
  Nothing here changes server state, so there is no token to check and none is implemented.
  A route that mutates something on the server would need the check written with it — not
  bolted on afterwards.
- **No stored personal data.** Whatever a person writes lives in their own browser
  (`localStorage` / IndexedDB) and is never sent to the server. There is no breach that exposes
  it, and equally no backup that restores it.
- **No secrets in the app's environment.** The three required variables (`PORT`, `APP_NAME`,
  `APP_URL`) are all public values.

## What is defended

- **Security headers and an enforcing CSP on every response**, set centrally in
  [`utils/security-headers.ts`](src/server/utils/security-headers.ts) via `secureRoutes` /
  `handleGuarded` rather than per route, so no response path can ship without them.
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, a tight source allowlist, and
  `upgrade-insecure-requests` in production.
- **Third-party scripts are allowlisted, pinned, and integrity-checked.** The script allowlist is
  `'self' 'unsafe-inline' https://esm.sh` — esm.sh serves Preact to the page's import map. A new
  third-party script needs the CSP entry and an SRI `integrity` hash, or it is silently blocked in
  the browser while passing every test.
- **Per-IP rate limiting** on the API ([`middleware/rate-limit.ts`](src/server/middleware/rate-limit.ts)),
  keyed on the socket address by default. `TRUST_PROXY=true` switches it to the last
  `x-forwarded-for` entry, which is correct behind exactly one proxy that rewrites the header and
  wrong everywhere else — the header is client-controlled without one.
- **Errors never leak internals.** `handleGuarded` catches everything and renders the styled 500
  page; `Bun.serve`'s `error()` is overridden so its stack-trace dev page can never be served.
- **Absolute links are built from `APP_URL`**, never from the request — `appUrl` in
  [`utils/app-url.ts`](src/server/utils/app-url.ts). `new URL(req.url).host` is the client's
  `Host` header, so deriving a link from it would let a forged header put an attacker's domain
  into a link the app presents as its own.
- **Graceful shutdown**, so a deploy drains in-flight responses instead of severing them.

## HTTP Headers, CSP & Transport

The defensive HTTP baseline — the header set, the CSP, HSTS, `/.well-known/security.txt`,
Subresource Integrity, and the deploy/DNS steps — lives in
[`runbooks/SECURITY.md`](runbooks/SECURITY.md). Read it before your first deploy: the
`security.txt` contact address needs setting, and TLS/HSTS-preload/CAA/DNSSEC are registrar-level
work the application cannot do for you.

## Reporting

Set `SECURITY_CONTACT` to a monitored address; it is published in
`/.well-known/security.txt` and is where reports should go.
