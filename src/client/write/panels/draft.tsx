import { NOVELTY_TYPES, UNSTICK_QUESTIONS } from "../guide";
import { countWords, PLACEHOLDER } from "../lint";
import type { Draft } from "../state";
import { updateSection } from "../state";
import { Panel } from "../ui";

interface Props {
  draft: Draft;
  onChange: (draft: Draft) => void;
}

/**
 * The braindump.
 *
 * Deliberately the least helpful panel in the app: no lint, no scores, no
 * flags. The handbook is explicit that a first draft is written fast and badly,
 * for yourself, and that the wastewater has to come out of the pipe before the
 * clear water arrives. Anything that invited editing here would be working
 * against that.
 */
export const DraftPanel = ({ draft, onChange }: Props) => {
  const insertPlaceholder = (sectionId: string, body: string) => {
    const spacer = body.endsWith("\n") || body === "" ? "" : "\n\n";
    onChange(
      updateSection(draft, sectionId, {
        body: `${body}${spacer}${PLACEHOLDER} `,
      }),
    );
  };

  return (
    <Panel
      title="Draft"
      lede="Speedrun it. Write for yourself now and everyone else later — you can't rewrite a blank page."
    >
      <div className="rules">
        <h3>Stuck? Ask yourself</h3>
        <ul>
          {UNSTICK_QUESTIONS.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ul>
        <p className="text-tertiary">
          Then follow whichever answer interests you more. If a passage bores
          you it bores your reader — you're the proxy.
        </p>
      </div>

      {draft.sections.length === 0 && (
        <p className="warning">
          No sections yet. Choose an objective in Aim, or add points in Outline.
        </p>
      )}

      {draft.sections.map((section) => {
        const words = countWords(section.body);
        return (
          <article className="section-block" key={section.id}>
            <header>
              <h3>{section.title}</h3>
              <span className={`badge badge-${section.kind}`}>
                {section.kind}
              </span>
              <span className="text-quaternary">{words} words</span>
            </header>
            <textarea
              rows={10}
              value={section.body}
              placeholder="Everything you've got on this point. Badly is fine."
              onInput={(event) =>
                onChange(
                  updateSection(draft, section.id, {
                    body: (event.target as HTMLTextAreaElement).value,
                  }),
                )
              }
            />
            <div className="button-row">
              <button
                type="button"
                className="btn-ghost"
                title="Park what you can't write yet and keep moving"
                onClick={() => insertPlaceholder(section.id, section.body)}
              >
                Insert {PLACEHOLDER}
              </button>
            </div>
          </article>
        );
      })}

      <div className="rules">
        <h3>What counts as novel</h3>
        <ul>
          {NOVELTY_TYPES.map((type) => (
            <li key={type.label}>
              <strong>{type.label}</strong> — “{type.reaction}”
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
};
