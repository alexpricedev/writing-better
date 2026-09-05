import { describe, expect, test } from "bun:test";
import { OBJECTIVES, TARGETS } from "./guide";
import { PROMPTS, parseDopamine, parseScore, stripScoreLine } from "./prompts";
import {
  createDraft,
  type Draft,
  seedOutline,
  update,
  updateSection,
} from "./state";

const sample = (): Draft => {
  let draft = seedOutline(createDraft("On quitting"), "story");
  draft = update(draft, {
    audience: "People who stayed too long",
    intro: "The morning I resigned, I still had my badge in my hand.",
  });
  return updateSection(draft, draft.sections[0].id, {
    body: "Half the story.",
  });
};

const promptById = (id: string) => {
  const prompt = PROMPTS.find((candidate) => candidate.id === id);
  if (!prompt) throw new Error(`No prompt ${id}`);
  return prompt;
};

describe("prompt templates", () => {
  test("every prompt carries the piece's objective and reader", () => {
    // An agent given the text alone judges it as generic prose. The objective
    // is what makes "this doesn't prove anything" the right or wrong note.
    const draft = sample();
    const objective = OBJECTIVES.find((entry) => entry.id === "story");

    for (const prompt of PROMPTS) {
      const built = prompt.build(draft);
      expect(built).toContain(objective?.label ?? "");
      expect(built).toContain("People who stayed too long");
    }
  });

  test("the intro prompts send the intro and not the body", () => {
    const draft = sample();

    for (const id of ["intro-rating", "skepticism"]) {
      const built = promptById(id).build(draft);
      expect(built).toContain("badge in my hand");
      expect(built).not.toContain("Half the story.");
    }
  });

  test("the whole-piece prompts send the body", () => {
    const draft = sample();

    for (const id of ["dopamine", "verbal-summary", "final-read"]) {
      expect(promptById(id).build(draft)).toContain("Half the story.");
    }
  });

  test("the intro rating carries the no-7s rule and the target", () => {
    // Both are counter-intuitive instructions an agent drops if you let it: a 7
    // is the score that commits to nothing, and chasing 10 bloats the intro.
    const built = promptById("intro-rating").build(sample());

    expect(built).toContain("may not answer 7");
    expect(built).toContain(String(TARGETS.intro));
    expect(built).toContain("SCORE:");
  });

  test("the final read asks for what to delete, not only what's wrong", () => {
    const built = promptById("final-read").build(sample());

    expect(built).toContain("What to delete");
    expect(built).toContain("What to double down on");
    expect(built).toContain(String(TARGETS.draft));
  });

  test("the dopamine prompt specifies the line format it will be parsed by", () => {
    const built = promptById("dopamine").build(sample());
    expect(built).toContain("SECTION: <section title> | HITS: <number>");
  });

  test("a blank draft still builds a usable prompt", () => {
    // Reached by clearing the title field, which is the first thing a writer
    // does to the default. The prompt has to survive it rather than telling an
    // agent the piece is called nothing at all.
    const built = promptById("final-read").build(
      update(createDraft(), { title: "" }),
    );
    expect(built).toContain("(untitled)");
    expect(built).toContain("(not chosen yet)");
    expect(built).toContain("(not stated)");
  });

  test("every prompt that asks for a score can be pasted back", () => {
    for (const prompt of PROMPTS) {
      const asksForScore = prompt.build(sample()).includes("SCORE: <number>");
      expect(prompt.pasteBack === "score").toBe(asksForScore);
    }
  });
});

describe("parseScore", () => {
  test("reads the line the prompt asked for", () => {
    expect(parseScore("SCORE: 8\n\nHere's why…")).toBe(8);
  });

  test("survives the formatting models add anyway", () => {
    expect(parseScore("**SCORE: 6**")).toBe(6);
    expect(parseScore("Score - 9")).toBe(9);
    expect(parseScore("score: 7.5")).toBe(7.5);
  });

  test("finds it below a preamble", () => {
    expect(parseScore("Happy to help.\n\nSCORE: 4\n\nThe intro drifts.")).toBe(
      4,
    );
  });

  test("returns null when there's no score to read", () => {
    expect(parseScore("This was great!")).toBeNull();
  });

  test("rejects a number outside 1-10 rather than recording nonsense", () => {
    // The ship gate reads this number, so a misparse is silently wrong in the
    // one value the writer trusts.
    expect(parseScore("SCORE: 0")).toBeNull();
    expect(parseScore("SCORE: 42")).toBeNull();
  });
});

describe("stripScoreLine", () => {
  test("drops the score line and keeps the reasons", () => {
    expect(stripScoreLine("SCORE: 8\n\nThe opening drifts.")).toBe(
      "The opening drifts.",
    );
  });

  test("drops it wrapped in the bold a model adds", () => {
    expect(stripScoreLine("**SCORE: 6**\nToo long.")).toBe("Too long.");
  });

  test("leaves a reply that never had one", () => {
    expect(stripScoreLine("Good read.")).toBe("Good read.");
  });

  test("keeps a sentence that merely mentions the score", () => {
    // Only a line that *starts* with the marker is the machine-readable one.
    expect(stripScoreLine("I'd score this an 8 overall.")).toBe(
      "I'd score this an 8 overall.",
    );
  });
});

describe("parseDopamine", () => {
  test("reads one reading per section line", () => {
    const reply = [
      "Here's the count.",
      "SECTION: Hook with half the story | HITS: 3",
      "SECTION: Narrate the full story | HITS: 0",
      "",
      "The middle drags.",
    ].join("\n");

    expect(parseDopamine(reply)).toEqual([
      { sectionTitle: "Hook with half the story", hits: 3 },
      { sectionTitle: "Narrate the full story", hits: 0 },
    ]);
  });

  test("strips the bold a model wraps the line in", () => {
    expect(parseDopamine("**SECTION: The lesson | HITS: 2**")).toEqual([
      { sectionTitle: "The lesson", hits: 2 },
    ]);
  });

  test("returns nothing when the format wasn't followed", () => {
    expect(parseDopamine("I found three interesting bits.")).toEqual([]);
  });
});
