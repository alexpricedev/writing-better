import { describe, expect, test } from "bun:test";
import { renderToString } from "preact-render-to-string";
import { Nav } from "./nav";

describe("Nav", () => {
  test("ships the mobile toggle hidden and collapsed", () => {
    const html = renderToString(<Nav page="home" />);

    // Hidden until src/client/components/nav-menu.ts takes over — a page
    // without that script must not render a button that toggles nothing.
    expect(html).toContain("hidden");
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="nav-menu"');
    expect(html).toContain('id="nav-menu"');
  });

  test("keeps the toggle outside the panel it reveals", () => {
    const html = renderToString(<Nav page="home" />);

    // Everything the toggle reveals lives inside the wrapper; only the button
    // itself is left outside it.
    expect(html.slice(0, html.indexOf('id="nav-menu"'))).toContain(
      "nav-toggle",
    );
  });
});
