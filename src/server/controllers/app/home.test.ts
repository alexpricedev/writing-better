import { describe, expect, test } from "bun:test";
import { home } from "./home";

describe("Home Controller", () => {
  describe("GET /", () => {
    test("renders home page wrapped in the layout", async () => {
      const response = home.index();
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain('data-page="home"');
      expect(html).toContain("<main>");
    });
  });
});
