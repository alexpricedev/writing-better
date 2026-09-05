/**
 * The five jobs the handbook gives to other people, written as prompts.
 *
 * Half its machinery is readers: rate this intro, highlight every sentence that
 * delighted you, summarise the piece back to me in thirty seconds. This app has
 * no accounts and no server, so it can't gather that — and hitting a model API
 * would mean keys, cost and a signup. So each prompt is built here with all the
 * context an agent needs, copied to the clipboard, and pasted into whatever
 * assistant the writer already pays for. The reply comes back through the same
 * door.
 *
 * Each prompt carries the handbook's rules verbatim, because the rules are the
 * unintuitive part: no 7s on the intro score, aim for 8 and not higher, tell me
 * what to delete. An agent left to its own instincts gives encouraging,
 * useless feedback.
 */

import { findObjective, SKEPTICISMS, TARGETS } from "./guide";
import type { DopamineReading, Draft } from "./state";
import { toMarkdown } from "./state";

export interface PromptTemplate {
  id: string;
  label: string;
  /** Why you'd reach for this one, in the writer's terms. */
  purpose: string;
  /** Whether the reply is meant to be pasted back into the app. */
  pasteBack: "score" | "dopamine" | null;
  build: (draft: Draft) => string;
}

const context = (draft: Draft): string => {
  const objective = findObjective(draft.objectiveId);
  const lines = [
    `Title: ${draft.title || "(untitled)"}`,
    `Objective: ${objective ? objective.label : "(not chosen yet)"}`,
    `Intended reader: ${draft.audience.trim() || "(not stated)"}`,
  ];
  return lines.join("\n");
};

const fence = (label: string, body: string): string =>
  [`--- ${label} ---`, body.trim() || "(empty)", `--- end ${label} ---`].join(
    "\n",
  );

const PREAMBLE =
  "You are giving a writer blunt feedback on a piece of nonfiction. Follow the instructions exactly, including the scoring rules — they come from the handbook the writer is working from, and the unusual parts are deliberate. Do not soften your assessment to be encouraging: a kind score that is wrong costs the writer weeks on a piece nobody wants to read.";

export const PROMPTS: PromptTemplate[] = [
  {
    id: "intro-rating",
    label: "Rate the intro",
    purpose:
      "The handbook's first checkpoint. Aim for 8 out of 10, and stop there.",
    pasteBack: "score",
    build: (draft) =>
      [
        PREAMBLE,
        "",
        "You are reading ONLY the introduction of a piece. Do not ask for the rest — judging the intro on its own is the point.",
        "",
        context(draft),
        "",
        fence("intro", draft.intro),
        "",
        "Do four things, in this order:",
        "",
        "1. Score how interesting this intro is, from 1 to 10. You may not answer 7 — choose 6 or 8 to 10, so the score commits to a side. A score of 8 means all three of: it hooks the reader into the topic, it conveys why the topic matters, and it is concise. Do not inflate: a low score spares the writer from a piece no one wants to read.",
        "2. Answer this, as a reader would: after reading only this intro, what are the most interesting ideas this piece could possibly cover?",
        "3. If you were writing this piece, what questions would you most want answered?",
        "4. Name anything that made you skeptical the piece would be worth your time.",
        "",
        "Start your reply with a line in exactly this format so it can be recorded: SCORE: <number>",
        `The writer is aiming for ${TARGETS.intro}. Higher is not better — ideas are rarely interesting to everyone, and chasing a 10 produces a bloated intro.`,
      ].join("\n"),
  },
  {
    id: "skepticism",
    label: "Probe the intro's skepticisms",
    purpose:
      "Five reasons a reader bails. Find the ones this intro hasn't answered.",
    pasteBack: null,
    build: (draft) =>
      [
        PREAMBLE,
        "",
        "A reader abandons an introduction for five reasons. Judge this intro against each one, and be specific about which sentence does or doesn't do the work.",
        "",
        context(draft),
        "",
        fence("intro", draft.intro),
        "",
        "The five skepticisms, and the counter to each:",
        "",
        ...SKEPTICISMS.map(
          (skepticism, index) =>
            `${index + 1}. ${skepticism.label} — ${skepticism.doubt}. Counter: ${skepticism.counter}.`,
        ),
        "",
        "For each of the five: does this intro answer it? Quote the sentence that does, or say it's unanswered and suggest the smallest addition that would fix it. Then say which single one is costing this intro the most readers.",
      ].join("\n"),
  },
  {
    id: "dopamine",
    label: "Count the dopamine hits",
    purpose: "Find the stretches with no insight or surprise in them.",
    pasteBack: "dopamine",
    build: (draft) =>
      [
        PREAMBLE,
        "",
        "Read the piece below as an interested reader, slowly, and mark every sentence that gives you a genuine hit of delight — the 'ahh, that's cool / profound / fascinating' reaction. Be stingy. A sentence that merely reads well is not a hit; a sentence that told you something you didn't know, or said a familiar thing beautifully, is.",
        "",
        context(draft),
        "",
        fence("piece", toMarkdown(draft)),
        "",
        "Report in two parts.",
        "",
        "Part one — one line per section, in exactly this format, so the counts can be recorded:",
        "SECTION: <section title> | HITS: <number>",
        "",
        "Part two — for every stretch of writing that ran long without a hit, quote its first few words and say which it needs: cutting down, or an insight injected. The goal is a steady cadence of hits, not a uniformly high one.",
      ].join("\n"),
  },
  {
    id: "verbal-summary",
    label: "Summarise it back in 30 seconds",
    purpose:
      "The reset for a bloated section: delete it, and rebuild from what actually survived a retelling.",
    pasteBack: null,
    build: (draft) =>
      [
        PREAMBLE,
        "",
        "Read the piece below, then summarise it out loud as you would to a friend on the phone — about thirty seconds, no more than 75 words. Keep only what you'd bother saying aloud.",
        "",
        context(draft),
        "",
        fence("piece", toMarkdown(draft)),
        "",
        "Give me three things:",
        "1. The 75-word spoken summary.",
        "2. The single sentence that is what this piece is really about.",
        "3. What you dropped from the summary, and whether the piece would lose anything by dropping it too.",
        "",
        "The writer will delete their draft and rebuild it from your summary, adding words back only where the ideas need them to land. So do not pad it to be polite — anything you include, they will keep.",
      ].join("\n"),
  },
  {
    id: "final-read",
    label: "Score the full draft",
    purpose: `The ship gate. Average ${TARGETS.draft}+ across a handful of readers.`,
    pasteBack: "score",
    build: (draft) =>
      [
        PREAMBLE,
        "",
        "Read the whole piece and react as you go, the way a real reader would — noting where you drifted, not only what was wrong with it.",
        "",
        context(draft),
        "",
        fence("piece", toMarkdown(draft)),
        "",
        "Give me four things:",
        "",
        "1. What to delete. Every place your interest faded — say 'I'm drifting here', quote where, and say what would get to the point quicker.",
        "2. What to double down on. Every place you got a hit of delight — quote it and say what you'd want more of.",
        "3. What isn't clear. Anything you had to re-read, and any point you couldn't restate in your own words afterwards.",
        "4. A score from 1 to 10 for how satisfying this was to read. Don't be afraid of a low score.",
        "",
        "Start your reply with a line in exactly this format so it can be recorded: SCORE: <number>",
        `The writer ships at an average of ${TARGETS.draft} across several readers, and is explicitly not chasing 9+ — one reader's 9 is not another's, and writing to satisfy everyone produces a piece that satisfies no one.`,
      ].join("\n"),
  },
];

/**
 * Pull `SCORE: 8` out of an agent's reply.
 *
 * Deliberately forgiving about what surrounds it — models wrap the line in bold
 * markdown, or lead with a sentence — but strict about the number, since a
 * misread score is silently wrong in the one number the ship gate reads.
 */
export const parseScore = (reply: string): number | null => {
  const match = reply.match(/score\s*[:-]\s*\*{0,2}(\d{1,2}(?:\.\d)?)/i);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value < 1 || value > 10) return null;
  return value;
};

/**
 * Drop the `SCORE:` line from a reply before it's stored as a note.
 *
 * The number is rendered beside the note, so keeping the line means every entry
 * in the score list opens by repeating what's already on screen.
 */
export const stripScoreLine = (reply: string): string =>
  reply
    .split("\n")
    .filter((line) => !/^\s*\**\s*score\s*[:-]/i.test(line))
    .join("\n")
    .trim();

/** Pull the `SECTION: … | HITS: n` lines out of a dopamine reply. */
export const parseDopamine = (reply: string): DopamineReading[] => {
  const readings: DopamineReading[] = [];

  for (const line of reply.split("\n")) {
    const match = line.match(
      /section\s*:\s*(.+?)\s*\|\s*hits\s*:\s*\*{0,2}(\d+)/i,
    );
    if (!match) continue;

    const sectionTitle = match[1].replace(/\*/g, "").trim();
    const hits = Number(match[2]);
    if (!sectionTitle || !Number.isFinite(hits)) continue;

    readings.push({ sectionTitle, hits });
  }

  return readings;
};
