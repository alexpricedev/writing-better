import { useState } from "preact/hooks";
import {
  CLARITY_CHECKS,
  INTRIGUE_TRIFECTA,
  SUCCINCTNESS_PASSES,
} from "../guide";
import { lint, readability } from "../lint";
import { PROMPTS } from "../prompts";
import type { Draft, Section } from "../state";
import { togglePass, update, updateSection } from "../state";
import { CopyPrompt, Field, Panel, RecordDopamine, Rules } from "../ui";

interface Props {
  draft: Draft;
  onChange: (draft: Draft) => void;
}

const rewritePrompts = PROMPTS.filter((prompt) =>
  ["dopamine", "verbal-summary"].includes(prompt.id),
);

const TWEET_LIMIT = 280;

/**
 * The section being rewritten from memory, and what's been typed so far.
 *
 * Held here rather than in the draft on purpose: an unfinished memory rewrite
 * is scratch work, and persisting it would mean a half-remembered paragraph
 * outliving the session that produced it.
 */
interface MemoryRewrite {
  sectionId: string;
  text: string;
  revealed: boolean;
}

const SectionRewrite = ({
  draft,
  section,
  onChange,
  memory,
  setMemory,
}: Props & {
  section: Section;
  memory: MemoryRewrite | null;
  setMemory: (memory: MemoryRewrite | null) => void;
}) => {
  const flags = lint(section.body);
  const stats = readability(section.body);
  const active = memory?.sectionId === section.id;
  const hits = draft.dopamine.find(
    (reading) =>
      reading.sectionTitle.toLowerCase() === section.title.toLowerCase(),
  );

  return (
    <article className="section-block" key={section.id}>
      <header>
        <h3>{section.title}</h3>
        {hits && (
          <span
            className={
              hits.hits === 0 ? "badge badge-flat" : "badge badge-hits"
            }
          >
            {hits.hits} dopamine {hits.hits === 1 ? "hit" : "hits"}
          </span>
        )}
        {stats.words > 0 && (
          <span className="text-quaternary">
            {stats.words} words · grade {stats.grade}
          </span>
        )}
      </header>

      {active && memory ? (
        <div className="memory-rewrite">
          <p className="text-tertiary">
            Read it, take a break, then write it again from memory. Whatever you
            can't remember probably wasn't carrying its weight.
          </p>
          <textarea
            rows={10}
            value={memory.text}
            placeholder="From memory…"
            onInput={(event) =>
              setMemory({
                ...memory,
                text: (event.target as HTMLTextAreaElement).value,
              })
            }
          />
          {memory.revealed && (
            <div className="memory-original">
              <h4>The original</h4>
              <p>{section.body || "(empty)"}</p>
            </div>
          )}
          <div className="button-row">
            <button
              type="button"
              onClick={() => {
                onChange(
                  updateSection(draft, section.id, { body: memory.text }),
                );
                setMemory(null);
              }}
              disabled={!memory.text.trim()}
            >
              Replace the section with this
            </button>
            {!memory.revealed && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setMemory({ ...memory, revealed: true })}
              >
                Reveal the original
              </button>
            )}
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setMemory(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            rows={8}
            value={section.body}
            onInput={(event) =>
              onChange(
                updateSection(draft, section.id, {
                  body: (event.target as HTMLTextAreaElement).value,
                }),
              )
            }
          />

          <ul className="pass-list">
            {SUCCINCTNESS_PASSES.map((pass) => (
              <li key={pass.id}>
                <label title={pass.detail}>
                  <input
                    type="checkbox"
                    checked={section.passes.includes(pass.id)}
                    onChange={() =>
                      onChange(togglePass(draft, section.id, pass.id))
                    }
                  />
                  <span>{pass.label}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="button-row">
            <button
              type="button"
              className="btn-ghost"
              onClick={() =>
                setMemory({ sectionId: section.id, text: "", revealed: false })
              }
              disabled={!section.body.trim()}
            >
              Rewrite from memory
            </button>
          </div>

          {flags.length > 0 && (
            <ul className="flag-list">
              {flags.map((flag) => (
                <li key={`${flag.rule}-${flag.excerpt}`}>
                  <span className={`flag flag-${flag.rule}`}>{flag.rule}</span>
                  <span className="flag-excerpt">{flag.excerpt}</span>
                  <span className="text-tertiary">{flag.message}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
};

/**
 * Clarity, succinctness and intrigue — the three goals of a second draft.
 *
 * The lint flags live here and nowhere else. They are copyedit-grade advice, and
 * showing them while drafting would slow down the one stage that's supposed to
 * be fast.
 */
export const RewritePanel = ({ draft, onChange }: Props) => {
  const [memory, setMemory] = useState<MemoryRewrite | null>(null);
  const tweetLength = draft.tweetTest.trim().length;

  return (
    <Panel
      title="Rewrite"
      lede="The first draft got the ideas out. This one makes them land."
    >
      <Rules title="Clarity" items={CLARITY_CHECKS} />

      <div className="rules">
        <h3>Succinctness, in three passes</h3>
        <ul>
          {SUCCINCTNESS_PASSES.map((pass) => (
            <li key={pass.id}>
              <strong>{pass.label}</strong> — {pass.detail}
            </li>
          ))}
        </ul>
      </div>

      {draft.sections.map((section) => (
        <SectionRewrite
          key={section.id}
          draft={draft}
          section={section}
          onChange={onChange}
          memory={memory}
          setMemory={setMemory}
        />
      ))}

      <Rules title="The trifecta of intrigue" items={INTRIGUE_TRIFECTA} />

      <Field
        label="The tweet test"
        hint="Compress the whole piece into one tweet. If it survives, publish the tweet and delete the piece."
      >
        <textarea
          rows={3}
          value={draft.tweetTest}
          onInput={(event) =>
            onChange(
              update(draft, {
                tweetTest: (event.target as HTMLTextAreaElement).value,
              }),
            )
          }
        />
      </Field>
      {tweetLength > 0 && (
        <p className={tweetLength <= TWEET_LIMIT ? "warning" : "text-tertiary"}>
          {tweetLength}/{TWEET_LIMIT} characters.{" "}
          {tweetLength <= TWEET_LIMIT
            ? "It fits. If nothing important was lost, the tweet is the better piece."
            : "It doesn't fit — which is the good outcome. You have something meaty."}
        </p>
      )}

      <h3>Get it read</h3>
      {rewritePrompts.map((prompt) => (
        <CopyPrompt key={prompt.id} template={prompt} draft={draft} />
      ))}

      <RecordDopamine draft={draft} onChange={onChange} />

      {draft.dopamine.length > 0 && (
        <p className="text-tertiary">
          Sections showing zero hits are the flat stretches. Cut them down, or
          put an insight in them — a steady cadence beats one brilliant
          paragraph.
        </p>
      )}
    </Panel>
  );
};
