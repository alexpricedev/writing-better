## What & why

<!-- The change, and the problem it solves. Link the issue or runbook section if there is one. -->

## Checks CI can't run

<!-- Delete the lines that don't apply. -->

- [ ] Verified in the browser — CI has none
- [ ] New third-party script has a CSP entry, an SRI `integrity` hash, and a `preconnect` in `layouts.tsx`
- [ ] New page is registered in `client/main.ts` and its CSS `@import`ed in `client/style.css`
- [ ] New browser-stored data has an export and an erase path — nothing is recoverable from the server
- [ ] Changed headers, cookies, or metadata → the matching `runbooks/` doc is updated
- [ ] Renamed or deleted a file the docs point at → `README.md`, `CLAUDE.md`, and `runbooks/` still match reality

## Screenshots (optional)

<!-- Drop images here for UI changes. Before/after side by side helps. Delete this section if the change isn't user-visible. -->
