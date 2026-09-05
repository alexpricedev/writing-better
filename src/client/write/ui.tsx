/** Small shared pieces the panels build out of. */

import {
  type ComponentChildren,
  cloneElement,
  isValidElement,
  type VNode,
} from "preact";
import { useEffect, useId, useState } from "preact/hooks";
import type { PromptTemplate } from "./prompts";
import { parseDopamine, parseScore, stripScoreLine } from "./prompts";
import type { Draft, Score } from "./state";
import { addScore, update } from "./state";
import { copyToClipboard } from "./storage";

interface PanelProps {
  draft: Draft;
  onChange: (draft: Draft) => void;
}

export const Panel = ({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ComponentChildren;
}) => (
  <section className="panel">
    <header className="panel-head">
      <h2>{title}</h2>
      <p className="lead">{lede}</p>
    </header>
    {children}
  </section>
);

/**
 * A labelled control.
 *
 * The id is generated here and pushed onto the child rather than left to
 * implicit nesting: an explicit `for`/`id` pair is what screen readers announce
 * most reliably, and it means the hint can be wired up as a description instead
 * of being read as part of the label.
 */
export const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ComponentChildren;
}) => {
  const id = useId();
  const hintId = `${id}-hint`;

  const control = isValidElement(children)
    ? cloneElement(children as VNode<Record<string, unknown>>, {
        id,
        "aria-describedby": hint ? hintId : undefined,
      })
    : children;

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {hint && (
        <span className="field-hint" id={hintId}>
          {hint}
        </span>
      )}
      {control}
    </div>
  );
};

/**
 * Copies a built prompt and says so.
 *
 * The confirmation matters more than it looks: the writer is about to switch to
 * another app and paste, and finding an empty clipboard there means retyping
 * the whole piece by hand.
 */
export const CopyPrompt = ({
  template,
  draft,
}: {
  template: PromptTemplate;
  draft: Draft;
}) => {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    const ok = await copyToClipboard(template.build(draft));
    setState(ok ? "copied" : "failed");
  };

  return (
    <div className="prompt-card">
      <div className="prompt-card-body">
        <strong>{template.label}</strong>
        <span className="text-tertiary">{template.purpose}</span>
      </div>
      <button type="button" onClick={copy}>
        {state === "copied"
          ? "Copied — paste it to your assistant"
          : state === "failed"
            ? "Couldn't copy — check permissions"
            : "Copy prompt"}
      </button>
    </div>
  );
};

/**
 * Where an agent's reply comes back in.
 *
 * The whole reply is kept, not just the parsed number: the score is what the
 * ship gate reads, but the reasons underneath it are what the writer actually
 * acts on, and losing them would make the feedback loop a scoreboard.
 */
export const RecordReply = ({
  draft,
  onChange,
  stage,
}: PanelProps & { stage: Score["stage"] }) => {
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const record = () => {
    const score = parseScore(reply);
    if (score === null) {
      setError(
        "No score found. The reply needs a line like `SCORE: 8` — add one by hand if the agent dropped it.",
      );
      return;
    }

    setError(null);
    setReply("");
    onChange(addScore(draft, stage, score, stripScoreLine(reply)));
  };

  return (
    <div className="record-reply">
      <Field
        label="Paste the reply"
        hint="The score is read from it; the rest is kept with the piece."
      >
        <textarea
          rows={5}
          value={reply}
          placeholder="SCORE: 8&#10;&#10;What I'd delete…"
          onInput={(event) =>
            setReply((event.target as HTMLTextAreaElement).value)
          }
        />
      </Field>
      {error && <p className="warning">{error}</p>}
      <button type="button" onClick={record} disabled={!reply.trim()}>
        Record feedback
      </button>
    </div>
  );
};

/** The dopamine reply's counterpart: parses the per-section hit counts. */
export const RecordDopamine = ({ draft, onChange }: PanelProps) => {
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const record = () => {
    const readings = parseDopamine(reply);
    if (readings.length === 0) {
      setError(
        "No counts found. Each line needs to read `SECTION: <title> | HITS: <number>`.",
      );
      return;
    }

    setError(null);
    setReply("");
    onChange(update(draft, { dopamine: readings }));
  };

  return (
    <div className="record-reply">
      <Field
        label="Paste the dopamine reply"
        hint="Only the SECTION lines are read."
      >
        <textarea
          rows={5}
          value={reply}
          placeholder="SECTION: Narrate the full story | HITS: 3"
          onInput={(event) =>
            setReply((event.target as HTMLTextAreaElement).value)
          }
        />
      </Field>
      {error && <p className="warning">{error}</p>}
      <button type="button" onClick={record} disabled={!reply.trim()}>
        Record hits
      </button>
    </div>
  );
};

export const Checklist = ({
  items,
  checked,
  onToggle,
}: {
  items: { id: string; label: string; hint?: string }[];
  checked: string[];
  onToggle: (id: string) => void;
}) => (
  <ul className="checklist">
    {items.map((item) => (
      <li key={item.id}>
        <label>
          <input
            type="checkbox"
            checked={checked.includes(item.id)}
            onChange={() => onToggle(item.id)}
          />
          <span>
            {item.label}
            {item.hint && <span className="text-tertiary"> — {item.hint}</span>}
          </span>
        </label>
      </li>
    ))}
  </ul>
);

/** A read-only list of handbook rules, for the panels that are mostly reminders. */
export const Rules = ({ title, items }: { title: string; items: string[] }) => (
  <div className="rules">
    <h3>{title}</h3>
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);
