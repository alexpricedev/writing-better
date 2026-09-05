import { describe, expect, test } from "bun:test";
import { lint, PLACEHOLDER, readability } from "./lint";

const rules = (text: string): string[] => lint(text).map((flag) => flag.rule);

describe("lint", () => {
  test("says nothing about empty or whitespace-only text", () => {
    expect(lint("")).toEqual([]);
    expect(lint("   \n\n  ")).toEqual([]);
  });

  test("flags a sentence long enough to make the reader hold too much", () => {
    const long = `${"word ".repeat(30)}ends here.`;
    expect(rules(long)).toContain("long-sentence");
  });

  test("leaves a sentence at the limit alone", () => {
    const atLimit = `${"word ".repeat(24)}end.`;
    expect(rules(atLimit)).not.toContain("long-sentence");
  });

  test("flags a paragraph past five sentences", () => {
    const six = "One. Two. Three. Four. Five. Six.";
    expect(rules(six)).toContain("long-paragraph");
  });

  test("counts sentences per paragraph, not per document", () => {
    // Ten sentences, but never more than five in one paragraph — the rule is
    // about the wall of text, not the total length.
    const split =
      "One. Two. Three. Four. Five.\n\nSix. Seven. Eight. Nine. Ten.";
    expect(rules(split)).not.toContain("long-paragraph");
  });

  test("flags abstract filler", () => {
    const flags = lint("We leverage a robust ecosystem.");
    expect(flags.map((flag) => flag.excerpt)).toEqual(
      expect.arrayContaining(["leverage", "robust", "ecosystem"]),
    );
  });

  test("flags filler phrases", () => {
    expect(lint("We did it in order to win.")[0]?.excerpt).toBe("in order to");
  });

  test("reports each repeated word once, so one tic isn't twenty flags", () => {
    const flags = lint("Very very very good.");
    expect(flags.filter((flag) => flag.excerpt === "very")).toHaveLength(1);
  });

  test("flags adverbs a stronger verb would absorb", () => {
    expect(
      lint("He spoke loudly.").some((flag) => flag.rule === "adverb"),
    ).toBe(true);
  });

  test("ignores -ly words that aren't adverbs", () => {
    // The rule is worthless if it cries wolf on "only" and "family", which is
    // what the allowlist in lint.ts exists for.
    expect(rules("Only the family will reply.")).not.toContain("adverb");
  });

  test("flags an unfilled placeholder", () => {
    expect(rules(`Some words ${PLACEHOLDER} more words.`)).toContain(
      "placeholder",
    );
  });
});

describe("readability", () => {
  test("returns zeroes for empty text rather than dividing by zero", () => {
    expect(readability("")).toEqual({ words: 0, sentences: 0, grade: 0 });
  });

  test("scores plain short sentences below the thirteen-year-old line", () => {
    const plain = "The cat sat on the mat. The dog ran. We went home.";
    expect(readability(plain).grade).toBeLessThan(8);
  });

  test("scores dense abstract prose above it", () => {
    const dense =
      "The organizational implementation of institutional accountability mechanisms necessitates comprehensive reconsideration of administrative methodologies throughout the constituent departments.";
    expect(readability(dense).grade).toBeGreaterThan(12);
  });

  test("never reports a negative grade", () => {
    expect(readability("Go. Do. Be.").grade).toBeGreaterThanOrEqual(0);
  });
});
