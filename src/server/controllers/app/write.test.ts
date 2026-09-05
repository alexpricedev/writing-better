import { describe, expect, test } from "bun:test";
import { write } from "./write";

describe("Write Controller", () => {
  describe("GET /", () => {
    test("renders the app shell wrapped in the layout", async () => {
      const response = write.index();
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html");
      expect(html).toContain('data-page="write"');
      expect(html).toContain('id="app"');
    });
  });
});
