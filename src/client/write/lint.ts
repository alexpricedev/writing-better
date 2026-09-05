/**
 * The copyedit pass, done locally.
 *
 * These are the handbook's rules that a machine can actually check: sentence
 * length, paragraph length, adverbs a stronger verb would absorb, and the
 * abstract filler the guide singles out ("charting a course through a
 * landscape"). Everything else it asks for — is this novel, does it resonate,
 * is the middle boring — needs a reader, which is what the clipboard prompts
 * are for.
 *
 * Deliberately advisory. Every rule here has legitimate exceptions, so the UI
 * flags and never blocks, and the flags are worth reading in the copyedit pass
 * rather than while drafting: the first draft is meant to be fast and bad.
 */

export type LintRule =
  | "long-sentence"
  | "long-paragraph"
  | "adverb"
  | "filler"
  | "placeholder";

export interface LintFlag {
  rule: LintRule;
  /** What tripped: the sentence, the word, the paragraph's opening. */
  excerpt: string;
  message: string;
}

/** Past this, a reader is holding too many clauses in their head at once. */
export const MAX_SENTENCE_WORDS = 25;

/** The handbook's number: five sentences, so the page keeps its white space. */
export const MAX_PARAGRAPH_SENTENCES = 5;

/**
 * `-ly` words that aren't adverbs, or are adverbs no stronger verb replaces.
 * Without this list the rule is noise, and a noisy rule gets ignored wholesale.
 */
const NOT_ADVERBS = new Set([
  "only",
  "early",
  "family",
  "likely",
  "reply",
  "apply",
  "supply",
  "july",
  "italy",
  "ugly",
  "silly",
  "holy",
  "rely",
  "multiply",
  "imply",
  "assembly",
  "ally",
  "belly",
  "bully",
  "fly",
  "jelly",
  "rally",
  "melancholy",
  "monopoly",
  "anomaly",
]);

/**
 * Words that stand in for a specific example rather than adding one. The
 * abstract half comes from the guide's own worked example; the intensifiers
 * come from its rule that a sentence is brief once no more words can be
 * removed.
 */
const FILLER_WORDS = [
  "very",
  "really",
  "basically",
  "actually",
  "simply",
  "quite",
  "somewhat",
  "utilize",
  "leverage",
  "landscape",
  "ecosystem",
  "robust",
  "holistic",
  "synergy",
  "myriad",
  "plethora",
  "facilitate",
  "endeavor",
  "endeavour",
  "paradigm",
  "seamless",
  "cutting-edge",
];

const FILLER_PHRASES = [
  "in order to",
  "the fact that",
  "at this point in time",
  "it is important to note",
];

/** The marker the draft panel inserts, so an unfinished piece can't ship quietly. */
export const PLACEHOLDER = "<to fill out>";

const splitSentences = (text: string): string[] =>
  text
    // Split after . ! ? when followed by whitespace. Abbreviations produce the
    // occasional false split, which costs a spurious short sentence and never
    // a missed long one.
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

export const countWords = (text: string): number =>
  text.split(/\s+/).filter(Boolean).length;

export const countSentences = (text: string): number =>
  splitSentences(text).length;

const truncate = (text: string, max = 60): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

export const lint = (text: string): LintFlag[] => {
  const flags: LintFlag[] = [];
  if (!text.trim()) return flags;

  for (const paragraph of splitParagraphs(text)) {
    const sentences = splitSentences(paragraph);

    if (sentences.length > MAX_PARAGRAPH_SENTENCES) {
      flags.push({
        rule: "long-paragraph",
        excerpt: truncate(paragraph),
        message: `${sentences.length} sentences. Five or fewer keeps the white space that gives readers a pause.`,
      });
    }

    for (const sentence of sentences) {
      const words = countWords(sentence);
      if (words > MAX_SENTENCE_WORDS) {
        flags.push({
          rule: "long-sentence",
          excerpt: truncate(sentence),
          message: `${words} words. The longer the sentence, the more the reader holds in their head at once.`,
        });
      }
    }
  }

  const lower = text.toLowerCase();

  for (const phrase of FILLER_PHRASES) {
    if (lower.includes(phrase)) {
      flags.push({
        rule: "filler",
        excerpt: phrase,
        message:
          "Filler. Cut it, or replace it with the specific thing it's standing in for.",
      });
    }
  }

  const seenFiller = new Set<string>();
  const seenAdverb = new Set<string>();

  for (const raw of lower.match(/[a-z][a-z'-]*/g) ?? []) {
    if (FILLER_WORDS.includes(raw) && !seenFiller.has(raw)) {
      seenFiller.add(raw);
      flags.push({
        rule: "filler",
        excerpt: raw,
        message:
          "Abstract or filler. The complexity should come from the idea, not the wording.",
      });
      continue;
    }

    if (
      raw.length > 4 &&
      raw.endsWith("ly") &&
      !NOT_ADVERBS.has(raw) &&
      !seenAdverb.has(raw)
    ) {
      seenAdverb.add(raw);
      flags.push({
        rule: "adverb",
        excerpt: raw,
        message:
          'Adverb. Is there a verb that already means this? ("shouted", not "spoke loudly")',
      });
    }
  }

  if (text.includes(PLACEHOLDER)) {
    flags.push({
      rule: "placeholder",
      excerpt: PLACEHOLDER,
      message: "Still a placeholder. Fill it in before you ship.",
    });
  }

  return flags;
};

/** Vowel-group syllable estimate. Rough by design — it feeds a rough metric. */
const syllables = (word: string): number => {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  const groups = cleaned.replace(/e$/, "").match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
};

export interface Readability {
  words: number;
  sentences: number;
  /** Flesch-Kincaid grade level. */
  grade: number;
}

/**
 * A stand-in for the handbook's thirteen-year-old test. Flesch-Kincaid is only
 * a proxy — it counts syllables, not whether an idea is followable — so the UI
 * reports it as a signal to investigate rather than a target to game. Grade 8
 * is roughly a thirteen-year-old.
 */
export const readability = (text: string): Readability => {
  const sentences = splitSentences(text);
  const words = text.split(/\s+/).filter(Boolean);

  if (sentences.length === 0 || words.length === 0) {
    return { words: words.length, sentences: sentences.length, grade: 0 };
  }

  const syllableCount = words.reduce(
    (total, word) => total + syllables(word),
    0,
  );
  const grade =
    0.39 * (words.length / sentences.length) +
    11.8 * (syllableCount / words.length) -
    15.59;

  return {
    words: words.length,
    sentences: sentences.length,
    grade: Math.max(0, Math.round(grade * 10) / 10),
  };
};
