/**
 * The handbook, as data.
 *
 * Every list here comes from Julian Shapiro's writing handbook
 * (https://www.julian.com/guide/write/intro). The app's whole job is to walk a
 * draft through that process, so the guide's own vocabulary — objectives,
 * supporting and resulting points, the five skepticisms, the trifecta of
 * intrigue — is what the UI is built out of. Keeping it in one module means the
 * panels, the lint pass and the clipboard prompts can't drift from each other
 * or from the source.
 */

export type PointKind = "supporting" | "resulting";

/** A line in an objective's starting outline. */
export interface OutlinePoint {
  title: string;
  kind: PointKind;
}

export interface Objective {
  id: string;
  label: string;
  /**
   * The handbook gives a starting outline per objective. It is a scaffold, not
   * a cage — "specific enough to provide structure, but loose enough to not
   * confine expansive thinking" — so every point is editable once seeded.
   */
  outline: OutlinePoint[];
}

export const OBJECTIVES: Objective[] = [
  {
    id: "status-quo",
    label: "Open people's eyes by proving the status quo wrong",
    outline: [
      {
        title: "State that the reader's current worldview is false",
        kind: "supporting",
      },
      {
        title: "Establish how the widespread wrongness hurts society",
        kind: "supporting",
      },
      {
        title: "Establish what's required to change the view",
        kind: "supporting",
      },
      {
        title: "Predict how the world differs after the transition",
        kind: "resulting",
      },
      { title: "Explore the exciting byproducts", kind: "resulting" },
    ],
  },
  {
    id: "unspoken",
    label: "Articulate what everyone's thinking but no one is saying",
    outline: [
      { title: "State what everyone's thinking", kind: "supporting" },
      { title: "Establish why no one speaks up", kind: "supporting" },
      { title: "Predict the implications of the silence", kind: "resulting" },
      {
        title: "Predict the world if this gained attention",
        kind: "resulting",
      },
    ],
  },
  {
    id: "trends",
    label: "Identify key trends, then predict the future",
    outline: [
      { title: "State the current trends", kind: "supporting" },
      {
        title: "Establish their history and what caused them",
        kind: "supporting",
      },
      { title: "Predict where the trends lead", kind: "resulting" },
      { title: "Establish why those implications matter", kind: "resulting" },
    ],
  },
  {
    id: "original",
    label: "Contribute original insights through research and experimentation",
    outline: [
      { title: "Share the original insights", kind: "supporting" },
      { title: "Explain what they contribute to the field", kind: "resulting" },
    ],
  },
  {
    id: "distill",
    label: "Distill an overwhelming topic into something approachable",
    outline: [
      { title: "State the benefits of understanding it", kind: "supporting" },
      { title: "Establish your credibility", kind: "supporting" },
      { title: "Break the topic into digestible parts", kind: "supporting" },
      { title: "Explain what the reader gains", kind: "resulting" },
    ],
  },
  {
    id: "solution",
    label: "Share a solution to a tough problem",
    outline: [
      { title: "Establish how difficult the problem is", kind: "supporting" },
      { title: "State the benefits of the solution", kind: "supporting" },
      { title: "Walk through the solution", kind: "supporting" },
      { title: "Explain how to implement it", kind: "resulting" },
      { title: "Predict the impact if it's adopted", kind: "resulting" },
    ],
  },
  {
    id: "story",
    label: "Tell a suspenseful, emotional story that imparts a lesson",
    outline: [
      { title: "Hook with half the story", kind: "supporting" },
      { title: "Narrate the full story", kind: "supporting" },
      { title: "Establish the lesson", kind: "resulting" },
      { title: "Explain why it matters to the reader", kind: "resulting" },
    ],
  },
];

export const findObjective = (id: string | null): Objective | undefined =>
  OBJECTIVES.find((objective) => objective.id === id);

/**
 * The handbook separates the objective (what the piece accomplishes) from the
 * motivation (what keeps you writing it). A piece with an objective and no
 * motivation is the one you abandon for months — the guide's diagnosis of
 * long-term procrastination is "you chose a topic you're insufficiently
 * passionate about" — so both are asked for up front.
 */
export const MOTIVATIONS = [
  { id: "off-chest", label: "Does writing this get something off your chest?" },
  {
    id: "reason",
    label: "Does it help you reason through a nagging, unsolved problem?",
  },
  {
    id: "persuade",
    label: "Does it persuade others to do something you believe is important?",
  },
  {
    id: "obsess",
    label:
      "Do you obsess over the topic and want others to geek out on it too?",
  },
] as const;

/** A hook is half a story: pose it, withhold the answer. */
export const HOOK_TYPES = [
  {
    id: "question",
    label: "Question",
    hint: "Pose an intriguing question, but don't answer it",
  },
  {
    id: "narrative",
    label: "Narrative",
    hint: "Start a story, but withhold the conclusion",
  },
  {
    id: "research",
    label: "Research",
    hint: "Cite a finding, but only a small portion of it",
  },
  {
    id: "argument",
    label: "Argument",
    hint: "Make an unexpected claim, but don't yet explain it",
  },
] as const;

/** What a reader has to be given before the hook can land. */
export const INTRO_SPINE = [
  "Establish shared context",
  "Surface a problem, and what's at stake",
  "Explore why the problem matters",
  "Tease a clever solution",
];

/**
 * The five reasons a reader bails on an intro, each with the handbook's own
 * counter. Rendered as a checklist because they are cheap to fix in the intro
 * and expensive to discover after publishing.
 */
export const SKEPTICISMS = [
  {
    id: "superficial",
    label: "Superficial",
    doubt: "They don't believe you'll share anything new",
    counter: "Tease your original insights in the intro",
  },
  {
    id: "irrelevant",
    label: "Irrelevant",
    doubt: "They don't believe you'll cover the points they care about",
    counter: "List the points you'll cover",
  },
  {
    id: "sloppy",
    label: "Sloppy",
    doubt: "They don't want to sit through bad writing",
    counter: "Rewrite the intro to be clear, succinct and intriguing",
  },
  {
    id: "implausible",
    label: "Implausible",
    doubt: "They don't believe you'll deliver on your hooks",
    counter: "Quote authorities who agree with you",
  },
  {
    id: "untrustworthy",
    label: "Untrustworthy",
    doubt: "They don't believe you're qualified",
    counter:
      "Share relevant credentials — or be upfront that you're not an authority and frame the piece as exploratory",
  },
];

/** The five shapes a novel idea takes, and the reaction each earns. */
export const NOVELTY_TYPES = [
  {
    label: "Counter-intuitive",
    reaction: "I never realised the world worked that way",
  },
  {
    label: "Counter-narrative",
    reaction: "That's not how I was told the world worked",
  },
  {
    label: "Shock and awe",
    reaction: "That's crazy. I'd never have believed it",
  },
  {
    label: "Elegant articulation",
    reaction: "I couldn't have said it better myself",
  },
  { label: "Feeling seen", reaction: "Yes — that's exactly how I feel" },
];

/** Asked of yourself when the ideas stop flowing mid-draft. */
export const UNSTICK_QUESTIONS = [
  "How can I make this point more convincing?",
  "What are the interesting implications of what I just said?",
];

export const CLARITY_CHECKS = [
  "Plain wording — no abstract phrasing standing in for a specific example",
  "One idea per sentence",
  "A thirteen-year-old could follow the logic",
  "Examples *and* counter-examples where the wording alone won't carry it",
  "No nuance lost in the simplifying",
];

/**
 * Succinctness is a three-pass job, in this order. The first pass is the one
 * writers skip, and it is the one that does the work: rewriting from memory
 * after a break lets the fluff fall away instead of asking you to defend
 * every sentence you already wrote.
 */
export const SUCCINCTNESS_PASSES = [
  {
    id: "memory",
    label: "Rewrite from memory",
    detail:
      "Read the section, take a break, then rewrite it from memory — only the points that survived the break were load-bearing.",
  },
  {
    id: "strip",
    label: "Remove unnecessary words",
    detail:
      "Delete every word that doesn't add context. Extra words make readers slow down and do extra work.",
  },
  {
    id: "rephrase",
    label: "Rephrase from scratch",
    detail:
      "With the clarity of what's left, write the paragraph again from nothing. Your sentence is brief when no more words can come out.",
  },
];

export const INTRIGUE_TRIFECTA = [
  "A captivating intro, which buys goodwill for an imperfect middle",
  "At least one section of intense insight or surprise",
  "An ending that justifies why the piece was worth reading",
];

/** The scores the handbook tells you to write toward, and to stop at. */
export const TARGETS = {
  intro: 8,
  draft: 7.5,
} as const;

/**
 * What to do with feedback you disagree with. The 40% rule is the one worth
 * having on screen: at that point the handbook's verdict is simply "you are
 * wrong", and the instinct it's arguing against is the writer's own ego.
 */
export const FEEDBACK_RULES = [
  "If you agree with it, implement it.",
  "If 3 in 10 say the same thing and you're ambivalent, do it if it's quick.",
  "If 4 or more in 10 say the same thing and you disagree — you are wrong. Ask them why, and check your assumptions.",
];

/** The handbook's own definition of finished. */
export const DONE_CHECKLIST = [
  { id: "objective", label: "You've fulfilled the objective you chose" },
  { id: "score", label: "You've hit an average score of 7.5 or better" },
  {
    id: "settled",
    label: "You're no longer making significant edits when you rewrite",
  },
];
