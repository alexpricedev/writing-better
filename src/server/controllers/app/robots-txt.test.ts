import { describe, expect, test } from "bun:test";
import { SITE_URL } from "../../services/seo";
import { robotsTxt } from "./robots-txt";

describe("robots.txt Controller", () => {
  test("serves plain text with the correct content type", async () => {
    const response = robotsTxt.index();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Allow: /");
  });

  test("disallows the API for every group", async () => {
    const body = await robotsTxt.index().text();

    // Once per group: the wildcard and the named-crawler group. A named
    // user-agent group fully replaces the wildcard, so the rule has to repeat.
    expect(body.match(/Disallow: \/api\//g)).toHaveLength(2);
  });

  test("calls out named AI crawlers explicitly", async () => {
    const body = await robotsTxt.index().text();

    expect(body).toContain("User-agent: GPTBot");
    expect(body).toContain("User-agent: ClaudeBot");
    expect(body).toContain("User-agent: Google-Extended");
  });

  test("declares an open Content-Signal posture", async () => {
    const body = await robotsTxt.index().text();

    expect(body).toContain(
      "Content-Signal: search=yes, ai-input=yes, ai-train=yes",
    );
  });

  test("points at the absolute sitemap URL under SITE_URL", async () => {
    const body = await robotsTxt.index().text();

    expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});
