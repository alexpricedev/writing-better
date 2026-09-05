# Privacy Runbook

This app is **privacy-clean by default**: no analytics, no advertising, no
third-party trackers, no accounts, and no server-side store. What a person
writes is held in their own browser and never transmitted. Out of the box there
is nothing to consent to and — under the GDPR/ePrivacy rules — no cookie banner
is legally required.

That changes the moment you add anything non-essential: an analytics script, a
marketing pixel, an embedded video, an A/B tool, or any code that writes to
`localStorage`/`sessionStorage`/`IndexedDB`. At that point you owe your visitors
an **opt-in consent banner** and a **privacy policy**. This runbook covers the
default posture, the exact trigger for needing consent, and how to wire up the
[`@alexpricedev/billet-cookie-consent`](https://github.com/alexpricedev/billet-cookie-consent)
package plus a privacy policy when you cross that line.

No repository can ship your privacy policy for you — the copy depends entirely
on what *your* deployment collects. What this one can do is stay clean by
default and hand you the pattern.

## 1. What's privacy-clean by default

| Area | Default state | Where |
|---|---|---|
| Analytics | None. `analytics.ts` is a mock (`getVisitorStats()` returns a fake count); `/api/stats` is unused | [`src/server/services/analytics.ts`](../src/server/services/analytics.ts) |
| Cookies | None. There is no session, no auth, and no flash state, so the app sets no cookie of its own | — |
| Server-side data | None. No database, no user records, no request persistence | — |
| Client storage | The visitor's **own writing**, in their **own browser**. It is never sent anywhere, and nothing reads it but the page they typed it into | `src/client/` |
| Fonts | Self-hosted (`font-src 'self'`) — no Google Fonts, no external font CDN | [`security-headers.ts`](../src/server/utils/security-headers.ts) |
| Third-party egress | `connect-src 'self'` blocks XHR/fetch/beacon to other origins | [`security-headers.ts`](../src/server/utils/security-headers.ts) |
| Request logging | No IP, user-agent, headers, or request bodies logged in the request path | [`services/logger.ts`](../src/server/services/logger.ts) |

Storing a user's own document so the app can hand it back to them is
functionality they asked for, not tracking: it is strictly necessary to the
service they requested, so it is **exempt** from consent under the ePrivacy
Directive. It still needs **disclosure** (see §4), and the disclosure is a
selling point — say plainly that the writing stays on the device.

The exemption is narrow, and it is about *purpose*, not *mechanism*. The moment
something in `localStorage` exists to profile the visitor rather than to serve
them their own content, it needs consent like anything else.

## 2. The trigger: when you actually need a consent banner

You need a banner **before** the first non-essential storage or tracking call —
never on an ordinary page view of the default site. Add one when you introduce
any of:

- Analytics or product-metrics scripts (Plausible, GA, PostHog, etc.)
- Advertising / retargeting pixels or tags
- Social or video embeds that set cookies (YouTube, Twitter, etc.)
- A/B testing or session-replay tools
- Any client code writing to `localStorage`/`sessionStorage`/`IndexedDB` for a
  non-essential purpose

**Strictly-necessary storage never needs consent** — the visitor's own saved
writing stays banner-free. The rule is *behavioural*: what your site does before
the user interacts, not whether a banner is on screen.

## 3. Wire up the consent banner

Use [`@alexpricedev/billet-cookie-consent`](https://github.com/alexpricedev/billet-cookie-consent) —
vanilla DOM, zero dependencies, scoped CSS tokens, and written for this tree's
upstream, so it drops into the same server-JSX + islands model.
The package README is the source of truth; adapt snippets to this repo's
controller/template signatures. Read it first:

```
node_modules/@alexpricedev/billet-cookie-consent/README.md
```

**Install**

```bash
bun add @alexpricedev/billet-cookie-consent
```

**Step 1 — import the CSS once** in [`src/client/style.css`](../src/client/style.css):

```css
@import "@alexpricedev/billet-cookie-consent/styles.css";
```

**Step 2 — initialise on the client.** Create `src/client/pages/consent.ts` and
register it in [`src/client/main.ts`](../src/client/main.ts) with
`import "./pages/consent";` so it runs on every page:

```ts
import { CookieConsent } from "@alexpricedev/billet-cookie-consent";

const consent = CookieConsent.init({
  categories: [
    { id: "necessary", label: "Strictly necessary", required: true,
      description: "Required for the site to function. Always on." },
    { id: "analytics", label: "Analytics",
      description: "Helps us understand how the site is used." },
    { id: "marketing", label: "Marketing",
      description: "Used to personalise ads and content." },
  ],
  policyUrl: "/privacy",
});

if (consent.has("analytics")) loadAnalytics();
document.addEventListener("cc:consent-granted", (e) => {
  if (e.detail.category === "analytics") loadAnalytics();
});

// "Manage cookies" trigger — data attribute, never inline onclick, so it fits
// this app's server-JSX + islands model.
for (const el of document.querySelectorAll<HTMLElement>("[data-cc-open-prefs]")) {
  el.addEventListener("click", () => CookieConsent.current()?.show());
}

function loadAnalytics(): void {
  // Your analytics loader. Must be idempotent — only run once.
}
```

**Step 3 — add the withdraw-consent control.** GDPR requires users be able to
change their mind, so render a "Manage cookies" button in the footer
([`src/server/components/layouts.tsx`](../src/server/components/layouts.tsx)):

```tsx
<button type="button" data-cc-open-prefs>Manage cookies</button>
```

**Step 4 (recommended) — gate scripts server-side** so opted-out users never
even receive the analytics `<script>` tag. Read the cookie in the controller and
thread the flag into the template:

```tsx
import { parseConsent } from "@alexpricedev/billet-cookie-consent/server";

export const home = {
  index(req: Request): Response {
    const consent = parseConsent(req.headers.get("cookie"));
    return render(<Home analytics={consent?.state.analytics === true} />);
  },
};
```

```tsx
{props.analytics && <script src="https://plausible.io/js/script.js" defer />}
```

> Only import `parseConsent` once you have a real script to gate — this app's
> `noUnusedLocals` lint will reject an unused import. Defer §4 until then.

**Theming** — the banner ships in its own default look. Map this app's design
tokens onto the `--cc-*` variables on `[data-cc-root]` (in your global CSS) so it
matches the site; nothing leaks out of that scope. See the package README's
Theming section for the full token list.

**Non-negotiables** the package enforces or expects (spec §"Cookie consent"):

- **Never** set `HttpOnly` on the consent cookie — the client must read it.
- No non-essential script loads before the user opts in (that's what §Step 4 gives you).
- Accept and reject must be equal-weight, single-click; no pre-ticked non-essential boxes (avoid `default: true` — CJEU *Planet49* makes pre-ticked consent invalid).
- The choice is stored with a timestamp and schema version in the `cc_consent` cookie; a footer "Manage cookies" link lets users withdraw anytime.

## 4. The privacy policy (required once you collect anything)

A consent banner without a policy is non-compliant. If you add tracking, add a
`/privacy` page (service → template → controller → route → footer link, per
`CLAUDE.md`'s "Adding a New Page") and set `policyUrl: "/privacy"`. The policy
must disclose, at minimum:

1. **Controller identity** — legal/entity name, postal address, privacy contact
2. **Data categories** — what you collect (usage, IP/technical, payment…). As
   shipped the answer is *nothing*: say so, and say where the writing lives
3. **Processing purposes** — why, per category
4. **Lawful basis** — GDPR Art. 6 per purpose (consent, contract, legitimate interest…)
5. **Recipients / processors** — name them (e.g. your analytics vendor, host), and any non-EU/UK transfers + safeguards
6. **Retention periods** — how long, per category
7. **User rights** — access, rectify, erase, restrict, port, object, complain to a supervisory authority
8. **Cookies & tracking** — inline or link to a cookie notice
9. **Last-updated date** — visible at the top

Link it from the footer on every page, keep it reachable to everyone, name
specific partners (not vague categories), and update the date when it changes.

## 5. Global Privacy Control (GPC)

GPC is a browser signal (`Sec-GPC: 1` header / `navigator.globalPrivacyControl`)
that legally means "do not sell or share my data" in California, Colorado, and
others. This app does not read it because there is nothing to suppress.

Once you add tracking, honour it:

- Read `req.headers.get("sec-gpc") === "1"` (or `navigator.globalPrivacyControl`
  client-side) and treat it as a standing opt-out of the analytics/marketing
  categories — don't load those scripts, regardless of visitor location.
- Apply it to **all** users (strictest applicable preference for multi-region).
- Disclose GPC handling in the privacy policy (§4). Even the default site can add
  a one-line "we run no sale/sharing, so there is nothing for GPC to stop."
- GPC is *not* the GDPR cookie banner — it's a separate opt-out signal. Honour both.

## 6. Third-party script hygiene

Every `<script src>` from another origin can read the DOM, non-`HttpOnly`
cookies, `localStorage`, and the URL — the largest source of web data leaks. When
you add one:

- **Allowlist it in CSP.** Add the origin to `script-src`/`connect-src` in
  [`security-headers.ts`](../src/server/utils/security-headers.ts) — keep the
  default `connect-src 'self'` as tight as possible.
- **Prefer self-hosting** fonts, libraries, and icons over CDN loads.
- **Pin with Subresource Integrity** on stable URLs so a compromised CDN can't
  swap the file.
- **Gate non-essential scripts behind consent** (§3, Step 4).
- **Re-audit periodically** — list every contacted domain in DevTools' network
  panel and justify each one.

> Framework maintainer note: the esm.sh Preact modules loaded via the inline
> importmap in `layouts.tsx` carry no SRI (importmaps can't express `integrity`).
> Self-host Preact or pin to an immutable versioned URL if you want them covered.

## 7. Data minimisation & logging

Collect only what a specific purpose needs, keep it only as long as needed, and
keep it out of logs. The request path already logs no PII — preserve that:

- **Don't log IPs, user-agents, headers, or request bodies** in production. Use
  `log.*(category, message)` from [`services/logger.ts`](../src/server/services/logger.ts)
  with non-PII messages. Nothing in the request path logs a body today — don't
  add a dump to debug a form, least of all one carrying someone's draft.
- **Don't store raw IPs.** The rate-limit middleware keys an in-memory map by IP
  and never persists it — keep it that way if you wire it into routes.
- **Redact secrets and personal data** before logging; separate identifiers from
  behavioural data; set and enforce retention windows on anything you do store.
- **Retention is trivially satisfied while there is nothing to retain.** Adding
  the first server-side store is what creates the obligation: a table with an
  expiry needs a sweep that enforces it, and nothing else will notice the
  omission.
- **Give the user a way out of their own browser storage.** The counterpart to
  "we keep nothing" is that they can clear what they keep: an explicit erase
  action, and an export before it.

## 8. Verify

After wiring up consent:

```bash
bun run check    # lint + typecheck still pass
bun run test     # suite still green
```

Then in a browser (or the `/browse` skill):

1. Hard-reload the site — the banner appears.
2. Click **Reject all** — banner disappears; no analytics request fires; `document.cookie` contains `cc_consent=…` but no analytics cookie.
3. Reload — no banner (choice remembered).
4. Click the footer **Manage cookies** link — the preferences modal opens; ESC closes it.
5. Accept analytics — the gated script loads exactly once.
6. `curl -sI` a page with `Sec-GPC: 1` — confirm the analytics script is *not* injected server-side (if you implemented §5 gating).
7. View-source `/privacy` (if added) — returns `200`, shows the last-updated date and a footer link on every page.

## 9. Non-goals

Deliberately **not** shipped, and why:

- **A bundled privacy policy page** — the copy is deployment-specific (what *you*
  collect, under what basis). The default stays clean and gives you §4 as
  the template.
- **A consent banner in the default build** — legally unnecessary with zero
  non-essential storage, and shipping one would train users to click through a
  meaningless dialog. Add it via §3 the moment you add tracking.
- **Storage Access API wiring** — only relevant to cross-site embedded content
  needing partitioned cookies; the default site has no cross-site iframes.
- **Server-side GPC/analytics enforcement in core** — there's nothing to enforce
  until you add tracking; §5 shows the pattern to add alongside it.
