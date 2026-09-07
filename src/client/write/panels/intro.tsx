import { useState } from "preact/hooks";
import { HOOK_TYPES, INTRO_SPINE, SKEPTICISMS, TARGETS } from "../guide";
import { PROMPTS } from "../prompts";
import type { Draft } from "../state";
import {
  addHook,
  averageScore,
  moveHook,
  removeHook,
  toggleIn,
  update,
} from "../state";
import { Checklist, CopyPrompt, Field, Panel, RecordReply, Rules } from "../ui";

interface Props {
  draft: Draft;
  onChange: (draft: Draft) => void;
}

const introPrompts = PROMPTS.filter((prompt) =>
  ["intro-rating", "skepticism"].includes(prompt.id),
);

/**
 * The intro, written before the piece.
 *
 * The handbook's least intuitive instruction: write the intro first, and use
 * working out what would make *you* want to read it as the way to find the
 * talking points. So the hook list comes before the intro box, and the ranking
 * is the list's order — the top ones are the ones that go in.
 */
export const IntroPanel = ({ draft, onChange }: Props) => {
  const [question, setQuestion] = useState("");

  const add = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setQuestion("");
    onChange(addHook(draft, trimmed));
  };

  const average = averageScore(draft, "intro");
  const introScores = draft.scores.filter((score) => score.stage === "intro");

  return (
    <Panel
      title="Intro"
      lede="Hooks first, then the intro they go into. A hook is half a story — pose it, withhold the answer."
    >
      <h3>Hook brainstorm</h3>
      <p className="text-tertiary">
        If someone else wrote this intro, what questions would make you excited
        to read on? Write them down even when you have no answer. Then drag the
        best to the top — the top ones are your hooks.
      </p>
      <p className="text-tertiary">
        One line each. A hook is half a story, so a longer one has usually given
        away the other half.
      </p>

      <div className="hook-add">
        <input
          type="text"
          value={question}
          placeholder="What if the thing everyone calls a moat is actually the trap?"
          onInput={(event) =>
            setQuestion((event.target as HTMLInputElement).value)
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} disabled={!question.trim()}>
          Add
        </button>
      </div>

      {draft.hooks.length === 0 ? (
        <p className="text-tertiary">No hooks yet.</p>
      ) : (
        <ol className="hook-list">
          {draft.hooks.map((hook, index) => (
            <li key={hook.id}>
              <span className="outline-index">{index + 1}</span>
              <span
                className={
                  index < 2 ? "hook-question hook-top" : "hook-question"
                }
              >
                {hook.question}
              </span>
              <span className="row-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  aria-label="Move up"
                  onClick={() => onChange(moveHook(draft, hook.id, -1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  aria-label="Move down"
                  onClick={() => onChange(moveHook(draft, hook.id, 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  aria-label="Remove hook"
                  onClick={() => onChange(removeHook(draft, hook.id))}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="rules">
        <h3>Four kinds of hook</h3>
        <ul>
          {HOOK_TYPES.map((type) => (
            <li key={type.id}>
              <strong>{type.label}</strong> — {type.hint}
            </li>
          ))}
        </ul>
      </div>

      <Field
        label="The intro"
        hint="The least information that introduces the breadth of what's coming and hooks the reader."
      >
        <textarea
          rows={12}
          value={draft.intro}
          onInput={(event) =>
            onChange(
              update(draft, {
                intro: (event.target as HTMLTextAreaElement).value,
              }),
            )
          }
        />
      </Field>

      <Rules title="The spine of a good intro" items={INTRO_SPINE} />

      <h3>Skepticisms answered</h3>
      <p className="text-tertiary">
        Five reasons a reader leaves. Tick the ones this intro now answers.
      </p>
      <Checklist
        items={SKEPTICISMS.map((skepticism) => ({
          id: skepticism.id,
          label: skepticism.label,
          hint: skepticism.counter,
        }))}
        checked={draft.skepticisms}
        onToggle={(id) =>
          onChange(
            update(draft, { skepticisms: toggleIn(draft.skepticisms, id) }),
          )
        }
      />

      <h3>Get it read</h3>
      {introPrompts.map((prompt) => (
        <CopyPrompt key={prompt.id} template={prompt} draft={draft} />
      ))}

      <RecordReply draft={draft} onChange={onChange} stage="intro" />

      {average !== null && (
        <p className={average >= TARGETS.intro ? "success" : "warning"}>
          Intro averaging <strong>{average}</strong> over {introScores.length}{" "}
          {introScores.length === 1 ? "read" : "reads"}. Target is{" "}
          {TARGETS.intro} — and not higher. An intro everyone rates 10 is one
          you've overwritten.
        </p>
      )}
    </Panel>
  );
};
