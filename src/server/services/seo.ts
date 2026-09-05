// Single source of truth for the site's public identity and SEO artefacts
// (sitemap, structured data). Templates and controllers import from here so the
// canonical host, name, and description can't drift across the codebase.

export const SITE_URL = "https://writing-better.example.com";
export const SITE_NAME = "Writing Better";
export const SITE_DESCRIPTION =
  "A free writing app. Your work stays in your browser.";

// Public, indexable routes included in the sitemap. API endpoints and any
// noindex route are intentionally omitted.
export const SITEMAP_PATHS = ["/"] as const;

const absolute = (path: string): string => new URL(path, SITE_URL).href;

export const buildSitemapXml = (): string => {
  const urls = SITEMAP_PATHS.map(
    (path) => `  <url>\n    <loc>${absolute(path)}</loc>\n  </url>`,
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
};

// Named AI crawlers we call out explicitly in robots.txt so the allow posture
// is unambiguous rather than only implied by the wildcard group. In robots.txt
// a named user-agent group fully replaces the wildcard for that agent, so each
// named group repeats the same Disallow rules.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "Google-Extended",
  "Applebot-Extended",
  "PerplexityBot",
  "CCBot",
] as const;

// Non-content surfaces kept out of every crawler's reach.
const ROBOTS_DISALLOW = ["/api/"] as const;

// Content-Signal (an emerging IETF AI Preferences / IAB Tech Lab proposal)
// declares downstream-use consent explicitly for crawlers that honour it.
const CONTENT_SIGNAL = "Content-Signal: search=yes, ai-input=yes, ai-train=yes";

// Builds the /robots.txt body. The posture is deliberately open: search engines
// and the major AI crawlers are all allowed, with only the API disallowed.
export const buildRobotsTxt = (): string => {
  const group = (agents: readonly string[]): string =>
    [
      ...agents.map((agent) => `User-agent: ${agent}`),
      "Allow: /",
      ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
      CONTENT_SIGNAL,
    ].join("\n");

  return [
    "# Search engines and AI crawlers are welcome. Only the API is disallowed.",
    "",
    group(["*"]),
    "",
    group(AI_CRAWLERS),
    "",
    `Sitemap: ${absolute("/sitemap.xml")}`,
    "",
  ].join("\n");
};

// Web app manifest (spec: resilience/pwa-manifest). `name`/`short_name` follow
// SITE_NAME, so updating the one constant renames the installed app too. Colours match the
// dark theme (--color-bg in style.css / THEME_COLOR in layouts.tsx). The 512px
// icon doubles as the maskable icon; swap in a purpose-built, safe-zone-padded
// asset if you need edge-to-edge Android adaptive icons.
export const buildWebManifest = (): string =>
  JSON.stringify({
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#0a0a0b",
    background_color: "#0a0a0b",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  });

// Site-level JSON-LD (WebSite + Organization) injected into every public page's
// <head>. Gives search engines and AI agents a machine-readable description of
// the site using the schema.org vocabulary.
export const siteStructuredData = (): string =>
  JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: absolute("/og-image.png"),
      },
    ],
  });
