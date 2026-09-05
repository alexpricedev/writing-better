# Writing Better

A companion for writing nonfiction worth reading, built as a single Bun process. Your work stays
in your browser — the server stores nothing about you.

---

## What it does

It walks a piece through the process in
[Julian Shapiro's writing handbook](https://www.julian.com/guide/write/intro), one panel per
stage:

| Panel | What it holds |
|---|---|
| **Aim** | The objective (one of seven) and the motivation. The objective seeds the outline |
| **Intro** | Hook brainstorm and ranking, the intro, and the five skepticisms a reader bails on |
| **Outline** | Supporting points and resulting points, seeded from the objective |
| **Draft** | One box per section, the two unstick questions, and `<to fill out>` placeholders |
| **Rewrite** | Clarity checks, the three succinctness passes, rewrite-from-memory, the tweet test, and the dopamine map |
| **Ship** | Score history against the 7.5 gate, the done checklist, and markdown export |

The handbook's rules live as data in `src/client/write/guide.ts`, so the panels, the copyedit
lint and the feedback prompts can't drift from each other.

### Feedback without an account

Half the handbook's machinery is other people: rate this intro out of 10, highlight every
sentence that delighted you, summarise the piece back to me in thirty seconds. This app has no
accounts and no server to collect that through, and calling a model API would mean keys and
cost. So it builds the prompt instead — the piece, its objective, its intended reader, and the
handbook's exact instructions — copies it to the clipboard, and takes the reply back through a
paste box. Five prompts: rate the intro, probe its skepticisms, count the dopamine hits,
summarise it in thirty seconds, score the full draft.

Scores are parsed out of the reply (`SCORE: 8`) and tracked against the handbook's targets: 8 for
an intro, an average of 7.5 to ship, and explicitly not higher.

### The local copyedit pass

What a machine can check without a reader: sentences over 25 words, paragraphs over five
sentences, `-ly` adverbs a stronger verb would absorb, abstract filler, unfilled placeholders,
and a Flesch-Kincaid grade as a proxy for the handbook's thirteen-year-old test. Advisory only,
and shown in Rewrite rather than in Draft — the first draft is meant to be fast and bad.

---

## What's Included

### No accounts, no database

There is no sign-in, no user record, and no server-side store. Whatever a person writes lives in
their own browser (`localStorage` / IndexedDB), which is what makes the app free to run and free
of the obligations that come with holding other people's writing: no breach surface, no data
export requests, no backups to lose.

The trade is real and worth stating in the product: clearing site data loses the work, and there
is no sync between devices.

### Security

- Security headers and a Content Security Policy on **every** response, set centrally rather than
  per route
- HSTS in production, `frame-ancestors 'none'`, `object-src 'none'`, locked-down `base-uri`
- Per-IP rate limiting on the API, with a proxy-aware client-IP source (`TRUST_PROXY`)
- A `/.well-known/security.txt` with a configurable reporting address
- Error pages that never leak a stack trace, and a `Bun.serve` `error()` backstop so the dev error
  page can't reach production

### SEO and resilience

- Canonical URLs, Open Graph and Twitter cards, JSON-LD, a sitemap, `robots.txt`, `llms.txt`
- A web app manifest generated from one `SITE_NAME` constant
- Error and maintenance pages that ship **no** client JavaScript, so they render when the app is
  degraded
- Graceful SIGTERM/SIGINT draining, so a deploy doesn't sever in-flight responses

### Testing

- `bun test` under `--isolate`, one worker per core
- happy-dom for client tests, with Bun's native `Request`/`Response` restored
- A real-browser smoke test (`bun run test:browser`) that catches what happy-dom can't: CSP
  blocks, an unapplied stylesheet, a bundle that parses but doesn't run

### Frontend

- Server-rendered Preact templates (`preact-render-to-string`), no hydration by default
- Preact islands in `src/client/` for the interactive parts
- Plain CSS, no framework, no build step beyond `bun build`

---

## Quick Start

```bash
bun install
cp .env.example .env    # then edit APP_NAME / APP_URL if you like
bun run dev
```

The app is on http://localhost:3000.

Three environment variables are required — `PORT`, `APP_NAME`, `APP_URL` — and the server refuses
to boot without them. `APP_URL` must include the port.

---

## Project Structure

```
src/
├── client/                     # Browser-side code
│   ├── main.ts                 # Entry point — routes to page controllers
│   ├── page-lifecycle.ts       # Page init/cleanup system
│   ├── style.css               # Global styles (CSS entry point)
│   ├── components/             # Shared JS + CSS (nav, layout)
│   ├── pages/                  # Page-specific JS + CSS (co-located)
│   └── write/                  # The workspace
│       ├── guide.ts            # The handbook as data — objectives, checklists, targets
│       ├── prompts.ts          # The five clipboard prompts, and the reply parsers
│       ├── lint.ts             # The local copyedit pass
│       ├── state.ts            # The draft model and its pure transforms
│       ├── storage.ts          # localStorage, clipboard, export
│       └── panels/             # One panel per stage of the handbook
│
└── server/                     # Server-side code
    ├── main.ts                 # Server entry point
    ├── routes/
    │   ├── app.tsx             # View routes (HTML)
    │   └── api.ts              # API routes (JSON)
    ├── controllers/            # Route handlers
    │   ├── app/                # View controllers — return HTML
    │   └── api/                # API controllers — return JSON
    ├── templates/              # Full-page JSX templates
    ├── components/             # Reusable server JSX components
    ├── services/               # Business logic (assets, SEO, logging)
    ├── middleware/             # Rate limiting, client IP
    └── utils/                  # Response helpers, env validation, security headers

scripts/
├── wip                         # Per-worktree WIP snapshots
├── benchmark.ts                # Times the suite, checks and build; saves/compares records
├── browser-smoke.test.ts       # Real-browser smoke tests (`bun run test:browser`)
└── workspace.ts                # Per-workspace port provisioning

.claude/
├── settings.json               # Hooks shared with every agent on the repo
├── hooks/
│   └── no-shared-stash.ts      # Points at `bun run wip` instead of the shared ref
└── skills/                     # Progressive-disclosure guides for agents
```

---

## API Reference

One read-only endpoint ships, as the pattern to copy:

```
GET /api/stats    → { "data": { "visitorCount": 1234, "lastUpdated": "..." } }
```

### Conventions

- Every payload is wrapped in `data`, so metadata can be added later without breaking clients
- Every error is `{ "error": { "code", "message" } }` — assert on `code`, never on the prose
- Every route goes through `createApiRouteHandler`, which answers a wrong method with a JSON 405
  and an `Allow` header. A bare handler in a Bun routes map answers *every* method
- Every controller opens with the guards in `controllers/api/request-guard.ts`: media-type and
  body validation, id and pagination parsing, and the per-IP rate limit

[`.claude/skills/adding-a-feature/references/api-endpoint.md`](.claude/skills/adding-a-feature/references/api-endpoint.md)
is the checklist for adding one.

---

## Upstream

This tree began as a fork of [Billet](https://github.com/alexpricedev/Billet), with its auth,
teams, and database layers removed. `.billet-version` records which release it came from — keep
it, and keep it pointed at upstream: it is the only thing that answers "is this fix already in my
tree?" without diffing source against a repo you may not have as a remote. The file carries the
two `curl` commands for listing upstream's tags and reading its CHANGELOG.

---

## Contributing

Contributions are welcome! Please open issues or PRs.

---

## Deploy

A single Bun process — no containers, no serverless adapters, no platform-specific runtime, and
no database to provision. Anywhere you can run `bun run start`, it'll work: Railway, Fly.io,
Render, a VPS, or your own machine.

### Railway

A `railway.json` is included with build and start commands pre-configured.

1. Push to GitHub
2. Create a new [Railway](https://railway.com) project and connect your repo
3. Set the environment variables below
4. Deploy

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `APP_URL` | Yes | Your app's public URL, including the port when there is one (e.g. `https://my-app.up.railway.app`) |
| `APP_NAME` | Yes | Display name used in page metadata |
| `PORT` | Yes | Server port — auto-set by Railway; `3000` locally |
| `SECURITY_CONTACT` | No | Reporting address published in `/.well-known/security.txt`. Defaults to a placeholder — set it before launch |
| `TRUST_PROXY` | No | Set to `true` behind exactly one reverse proxy that rewrites `x-forwarded-for` (Railway does), so the rate limiter keys on the client rather than the proxy. Any value other than `true`/`false` stops the server at boot |
| `MAINTENANCE_MODE` | No | Set to `true` to serve a 503 page with `Retry-After` for every request but `/health` |

> **SEO:** Before your first deploy, set `SITE_URL` in `src/server/services/seo.ts` to your
> production domain — `robots.txt`, the sitemap, canonical URLs and JSON-LD are all built from
> it. See [runbooks/SEO.md](runbooks/SEO.md).

> **Security:** The HTTP hardening works out of the box, but set `SECURITY_CONTACT` and add the
> registrar-level records before launch — see [runbooks/SECURITY.md](runbooks/SECURITY.md) for
> the TLS, HSTS-preload, CAA, and DNSSEC steps.

> **Privacy:** As shipped there is no analytics, no tracker, and no non-essential storage, so no
> cookie banner is required. The moment you add analytics, ads, or embeds, you must add an opt-in
> consent banner and a privacy policy — see [runbooks/PRIVACY.md](runbooks/PRIVACY.md). The
> writing the app stores in the browser is the user's own and never leaves their device; that is
> a claim the privacy policy should make explicitly.

> **CI & merge protection:** CI runs on every PR, but check results are advisory until you require
> them. Nothing stops an auto-merge from merging a red build — enable required status checks once
> per repo. See [runbooks/CI.md](runbooks/CI.md).

---

## License

MIT — free for personal and commercial use.
