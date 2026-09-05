/**
 * The draft model, and the pure functions that change it.
 *
 * Every one of these takes a draft and returns a new one, so the components
 * hold state and nothing else, and the rules that matter — what a fresh draft
 * looks like, when a piece is ready to ship — are testable without a DOM.
 */

import {
  DONE_CHECKLIST,
  findObjective,
  type PointKind,
  TARGETS,
} from "./guide";

export interface Section {
  id: string;
  title: string;
  kind: PointKind;
  body: string;
  /** Which of the three succinctness passes this section has been through. */
  passes: string[];
}

export interface Hook {
  id: string;
  /** The captivating question. Answer withheld — that's what makes it a hook. */
  question: string;
}

export interface Score {
  id: string;
  stage: "intro" | "draft";
  value: number;
  note: string;
  at: string;
}

export interface DopamineReading {
  sectionTitle: string;
  hits: number;
}

export interface Draft {
  id: string;
  title: string;
  /** Who this is for, in the writer's words. Bundled into every prompt. */
  audience: string;
  objectiveId: string | null;
  motivations: string[];
  hooks: Hook[];
  intro: string;
  /** Skepticism ids the intro now answers. */
  skepticisms: string[];
  sections: Section[];
  /** The tweet test: if the whole piece fits here, publish the tweet instead. */
  tweetTest: string;
  dopamine: DopamineReading[];
  scores: Score[];
  done: string[];
  createdAt: string;
  updatedAt: string;
}

/** `crypto.randomUUID` needs a secure context; the fallback keeps file:// working. */
export const newId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const now = (): string => new Date().toISOString();

export const createDraft = (title = "Untitled"): Draft => ({
  id: newId(),
  title,
  audience: "",
  objectiveId: null,
  motivations: [],
  hooks: [],
  intro: "",
  skepticisms: [],
  sections: [],
  tweetTest: "",
  dopamine: [],
  scores: [],
  done: [],
  createdAt: now(),
  updatedAt: now(),
});

/** Every mutation goes through here, so `updatedAt` can't be forgotten. */
export const update = (draft: Draft, changes: Partial<Draft>): Draft => ({
  ...draft,
  ...changes,
  updatedAt: now(),
});

export const createSection = (title: string, kind: PointKind): Section => ({
  id: newId(),
  title,
  kind,
  body: "",
  passes: [],
});

/**
 * Replace the outline with the chosen objective's scaffold.
 *
 * Refuses when sections already carry writing: the outline is the cheap part
 * and the bodies are not, so switching objectives late must never silently
 * discard a draft. The caller decides what to do with `false`.
 */
export const canSeedOutline = (draft: Draft): boolean =>
  draft.sections.every((section) => section.body.trim() === "");

export const seedOutline = (draft: Draft, objectiveId: string): Draft => {
  const objective = findObjective(objectiveId);
  if (!objective) return draft;

  return update(draft, {
    objectiveId,
    sections: objective.outline.map((point) =>
      createSection(point.title, point.kind),
    ),
  });
};

export const addSection = (
  draft: Draft,
  kind: PointKind = "supporting",
): Draft =>
  update(draft, {
    sections: [...draft.sections, createSection("New point", kind)],
  });

export const updateSection = (
  draft: Draft,
  id: string,
  changes: Partial<Section>,
): Draft =>
  update(draft, {
    sections: draft.sections.map((section) =>
      section.id === id ? { ...section, ...changes } : section,
    ),
  });

export const removeSection = (draft: Draft, id: string): Draft =>
  update(draft, {
    sections: draft.sections.filter((section) => section.id !== id),
  });

export const moveSection = (draft: Draft, id: string, delta: number): Draft => {
  const from = draft.sections.findIndex((section) => section.id === id);
  if (from === -1) return draft;

  const to = from + delta;
  if (to < 0 || to >= draft.sections.length) return draft;

  const sections = [...draft.sections];
  const [moved] = sections.splice(from, 1);
  sections.splice(to, 0, moved);
  return update(draft, { sections });
};

export const togglePass = (
  draft: Draft,
  sectionId: string,
  passId: string,
): Draft => {
  const section = draft.sections.find(
    (candidate) => candidate.id === sectionId,
  );
  if (!section) return draft;

  const passes = section.passes.includes(passId)
    ? section.passes.filter((pass) => pass !== passId)
    : [...section.passes, passId];

  return updateSection(draft, sectionId, { passes });
};

export const toggleIn = (list: string[], id: string): string[] =>
  list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];

export const addHook = (draft: Draft, question: string): Draft =>
  update(draft, { hooks: [...draft.hooks, { id: newId(), question }] });

export const removeHook = (draft: Draft, id: string): Draft =>
  update(draft, { hooks: draft.hooks.filter((hook) => hook.id !== id) });

/**
 * Hooks are ranked by interest, and the top ones are the ones that go in the
 * intro — so their order is the ranking, and moving one is a real edit.
 */
export const moveHook = (draft: Draft, id: string, delta: number): Draft => {
  const from = draft.hooks.findIndex((hook) => hook.id === id);
  if (from === -1) return draft;

  const to = from + delta;
  if (to < 0 || to >= draft.hooks.length) return draft;

  const hooks = [...draft.hooks];
  const [moved] = hooks.splice(from, 1);
  hooks.splice(to, 0, moved);
  return update(draft, { hooks });
};

export const addScore = (
  draft: Draft,
  stage: Score["stage"],
  value: number,
  note: string,
): Draft =>
  update(draft, {
    scores: [...draft.scores, { id: newId(), stage, value, note, at: now() }],
  });

export const removeScore = (draft: Draft, id: string): Draft =>
  update(draft, { scores: draft.scores.filter((score) => score.id !== id) });

export const averageScore = (
  draft: Draft,
  stage: Score["stage"],
): number | null => {
  const values = draft.scores.filter((score) => score.stage === stage);
  if (values.length === 0) return null;

  const total = values.reduce((sum, score) => sum + score.value, 0);
  return Math.round((total / values.length) * 10) / 10;
};

/**
 * The handbook's finish line: the objective is met, the average score clears
 * 7.5, and rewriting has stopped producing significant edits. The first and
 * third are the writer's own judgement — hence the checklist — and the second
 * is the only one the app can verify, so it does.
 */
export const isReadyToShip = (draft: Draft): boolean => {
  const average = averageScore(draft, "draft");
  const scored = average !== null && average >= TARGETS.draft;
  const checked = DONE_CHECKLIST.every((item) => draft.done.includes(item.id));
  return scored && checked;
};

export const wordCount = (draft: Draft): number => {
  const text = [
    draft.intro,
    ...draft.sections.map((section) => section.body),
  ].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
};

/** Markdown export. The only copy that survives a cleared browser. */
export const toMarkdown = (draft: Draft): string => {
  const parts = [`# ${draft.title}`, ""];

  if (draft.intro.trim()) {
    parts.push(draft.intro.trim(), "");
  }

  for (const section of draft.sections) {
    parts.push(`## ${section.title}`, "");
    if (section.body.trim()) {
      parts.push(section.body.trim(), "");
    }
  }

  return `${parts.join("\n").trimEnd()}\n`;
};
