import { afterEach, describe, expect, test } from "bun:test";
import { createDraft } from "./state";
import { EMPTY_LIBRARY, filenameFor, load, save } from "./storage";

const KEY = "writing-better:library:v1";

afterEach(() => {
  localStorage.clear();
});

describe("load", () => {
  test("returns an empty library when nothing is stored", () => {
    expect(load()).toEqual(EMPTY_LIBRARY);
  });

  test("round-trips what save wrote", () => {
    const draft = createDraft("On quitting");
    save({ drafts: [draft], activeId: draft.id });

    const library = load();
    expect(library.drafts).toHaveLength(1);
    expect(library.drafts[0].title).toBe("On quitting");
    expect(library.activeId).toBe(draft.id);
  });

  test("survives a corrupt payload instead of taking the page down with it", () => {
    // The alternative is a blank app for anyone whose storage was written by a
    // different version, or truncated by a full quota mid-write.
    localStorage.setItem(KEY, "{not json");
    expect(load()).toEqual(EMPTY_LIBRARY);
  });

  test("drops entries that aren't drafts", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        drafts: [{ nope: true }, null, "text"],
        activeId: null,
      }),
    );
    expect(load().drafts).toEqual([]);
  });

  test("falls back to the first draft when the active id points at nothing", () => {
    const draft = createDraft();
    localStorage.setItem(
      KEY,
      JSON.stringify({ drafts: [draft], activeId: "gone" }),
    );
    expect(load().activeId).toBe(draft.id);
  });

  test("reports no active draft for an empty library", () => {
    localStorage.setItem(KEY, JSON.stringify({ drafts: [], activeId: "gone" }));
    expect(load().activeId).toBeNull();
  });
});

describe("save", () => {
  test("reports success", () => {
    expect(save({ drafts: [createDraft()], activeId: null })).toBe(true);
  });

  test("reports failure rather than throwing when storage refuses", () => {
    // A full quota is the realistic case, and the writer has to hear about it
    // while the words are still on screen.
    // defineProperty rather than assignment: happy-dom's localStorage is a
    // proxy that drops plain property writes, so `localStorage.setItem = fn`
    // silently does nothing and the test passes for the wrong reason.
    const original = localStorage.setItem.bind(localStorage);
    const override = (value: (key: string, item: string) => void) =>
      Object.defineProperty(localStorage, "setItem", {
        value,
        configurable: true,
      });

    override(() => {
      throw new Error("QuotaExceededError");
    });

    try {
      expect(save({ drafts: [createDraft()], activeId: null })).toBe(false);
    } finally {
      override(original);
    }
  });
});

describe("filenameFor", () => {
  test("slugs the title", () => {
    expect(filenameFor("On Quitting: a story")).toBe("on-quitting-a-story.md");
  });

  test("falls back when the title has nothing usable in it", () => {
    expect(filenameFor("  ")).toBe("draft.md");
    expect(filenameFor("!!!")).toBe("draft.md");
  });

  test("caps a long title", () => {
    expect(filenameFor("word ".repeat(50)).length).toBeLessThanOrEqual(63);
  });
});
