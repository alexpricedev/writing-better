import { describe, expect, test } from "bun:test";
import { DONE_CHECKLIST, OBJECTIVES } from "./guide";
import {
  addScore,
  averageScore,
  canSeedOutline,
  createDraft,
  type Draft,
  isReadyToShip,
  moveSection,
  removeSection,
  seedOutline,
  toggleIn,
  toMarkdown,
  update,
  updateSection,
} from "./state";

const withOutline = (objectiveId = "solution"): Draft =>
  seedOutline(createDraft("Test piece"), objectiveId);

const allChecked = DONE_CHECKLIST.map((item) => item.id);

describe("seedOutline", () => {
  test("lays down the chosen objective's scaffold", () => {
    const objective = OBJECTIVES[0];
    const draft = seedOutline(createDraft(), objective.id);

    expect(draft.objectiveId).toBe(objective.id);
    expect(draft.sections.map((section) => section.title)).toEqual(
      objective.outline.map((point) => point.title),
    );
    expect(draft.sections.map((section) => section.kind)).toEqual(
      objective.outline.map((point) => point.kind),
    );
  });

  test("ignores an objective that doesn't exist", () => {
    const draft = createDraft();
    expect(seedOutline(draft, "not-an-objective")).toBe(draft);
  });

  test("every objective's scaffold has both kinds of point", () => {
    // A piece made only of supporting points proves something and then stops.
    for (const objective of OBJECTIVES) {
      const kinds = new Set(objective.outline.map((point) => point.kind));
      expect(kinds.has("supporting")).toBe(true);
      expect(kinds.has("resulting")).toBe(true);
    }
  });
});

describe("canSeedOutline", () => {
  test("is true while the sections are empty", () => {
    expect(canSeedOutline(withOutline())).toBe(true);
  });

  test("is false once any section carries writing", () => {
    const draft = withOutline();
    const written = updateSection(draft, draft.sections[0].id, {
      body: "Some words.",
    });
    expect(canSeedOutline(written)).toBe(false);
  });
});

describe("moveSection", () => {
  test("swaps a section with its neighbour", () => {
    const draft = withOutline();
    const [first, second] = draft.sections;
    const moved = moveSection(draft, second.id, -1);

    expect(moved.sections[0].id).toBe(second.id);
    expect(moved.sections[1].id).toBe(first.id);
  });

  test("refuses to move past either end", () => {
    const draft = withOutline();
    const first = draft.sections[0];
    const last = draft.sections[draft.sections.length - 1];

    expect(moveSection(draft, first.id, -1).sections).toEqual(draft.sections);
    expect(moveSection(draft, last.id, 1).sections).toEqual(draft.sections);
  });

  test("leaves the draft alone for an id it doesn't hold", () => {
    const draft = withOutline();
    expect(moveSection(draft, "nope", 1)).toBe(draft);
  });
});

describe("removeSection", () => {
  test("drops only the named section", () => {
    const draft = withOutline();
    const target = draft.sections[1];
    const after = removeSection(draft, target.id);

    expect(after.sections).toHaveLength(draft.sections.length - 1);
    expect(after.sections.some((section) => section.id === target.id)).toBe(
      false,
    );
  });
});

describe("toggleIn", () => {
  test("adds what's missing and removes what's there", () => {
    expect(toggleIn([], "a")).toEqual(["a"]);
    expect(toggleIn(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("averageScore", () => {
  test("is null before anyone has read it", () => {
    expect(averageScore(createDraft(), "draft")).toBeNull();
  });

  test("averages a stage's scores to one decimal", () => {
    let draft = createDraft();
    draft = addScore(draft, "draft", 7, "");
    draft = addScore(draft, "draft", 8, "");
    expect(averageScore(draft, "draft")).toBe(7.5);
  });

  test("keeps the intro's scores out of the draft's average", () => {
    // The two stages are scored against different targets — 8 for the intro,
    // 7.5 for the piece — so mixing them would move the ship gate.
    let draft = createDraft();
    draft = addScore(draft, "intro", 10, "");
    draft = addScore(draft, "draft", 6, "");

    expect(averageScore(draft, "draft")).toBe(6);
    expect(averageScore(draft, "intro")).toBe(10);
  });
});

describe("isReadyToShip", () => {
  test("needs the score and the whole checklist", () => {
    let draft = addScore(createDraft(), "draft", 8, "");
    expect(isReadyToShip(draft)).toBe(false);

    draft = update(draft, { done: allChecked });
    expect(isReadyToShip(draft)).toBe(true);
  });

  test("stays false below the 7.5 average, however many boxes are ticked", () => {
    let draft = update(createDraft(), { done: allChecked });
    draft = addScore(draft, "draft", 7, "");
    expect(isReadyToShip(draft)).toBe(false);
  });

  test("stays false with no scores at all", () => {
    const draft = update(createDraft(), { done: allChecked });
    expect(isReadyToShip(draft)).toBe(false);
  });
});

describe("toMarkdown", () => {
  test("writes the title, intro and every section", () => {
    let draft = update(withOutline("story"), {
      title: "On quitting",
      intro: "The morning I resigned.",
    });
    draft = updateSection(draft, draft.sections[0].id, {
      body: "Half the story.",
    });

    const markdown = toMarkdown(draft);

    expect(markdown).toStartWith("# On quitting");
    expect(markdown).toContain("The morning I resigned.");
    expect(markdown).toContain(`## ${draft.sections[0].title}`);
    expect(markdown).toContain("Half the story.");
    expect(markdown).toEndWith("\n");
  });

  test("keeps an empty section's heading, so the gap is visible in the export", () => {
    const draft = withOutline();
    expect(toMarkdown(draft)).toContain(`## ${draft.sections[0].title}`);
  });
});
