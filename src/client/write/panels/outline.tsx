import { findObjective } from "../guide";
import type { Draft } from "../state";
import {
  addSection,
  canSeedOutline,
  moveSection,
  removeSection,
  seedOutline,
  updateSection,
} from "../state";
import { Panel } from "../ui";

interface Props {
  draft: Draft;
  onChange: (draft: Draft) => void;
}

/**
 * The outline, as supporting and resulting points.
 *
 * The distinction is the handbook's and it is worth keeping visible: supporting
 * points are what your argument needs to stand up, resulting points are what
 * follows if it does. An outline of only supporting points is a piece that
 * proves something and then stops, which is where most drafts end.
 */
export const OutlinePanel = ({ draft, onChange }: Props) => {
  const objective = findObjective(draft.objectiveId);

  const reset = () => {
    if (!draft.objectiveId) return;
    if (!canSeedOutline(draft)) {
      const confirmed = confirm(
        "Some sections already have writing in them. Resetting the outline deletes it. Continue?",
      );
      if (!confirmed) return;
    }
    onChange(seedOutline(draft, draft.objectiveId));
  };

  return (
    <Panel
      title="Outline"
      lede="Specific enough to give structure, loose enough that you still discover things while writing."
    >
      {objective ? (
        <p className="text-tertiary">
          Scaffold for <strong>{objective.label}</strong>. Rewrite every line of
          it — it's a starting point, not a form.
        </p>
      ) : (
        <p className="warning">
          No objective chosen yet. Pick one in Aim and its outline lands here.
        </p>
      )}

      <ul className="outline-list">
        {draft.sections.map((section, index) => (
          <li key={section.id}>
            <span className="outline-index">{index + 1}</span>
            <input
              type="text"
              value={section.title}
              onInput={(event) =>
                onChange(
                  updateSection(draft, section.id, {
                    title: (event.target as HTMLInputElement).value,
                  }),
                )
              }
            />
            <button
              type="button"
              className={`badge badge-${section.kind}`}
              title="Supporting points hold the argument up; resulting points are what follows from it"
              onClick={() =>
                onChange(
                  updateSection(draft, section.id, {
                    kind:
                      section.kind === "supporting"
                        ? "resulting"
                        : "supporting",
                  }),
                )
              }
            >
              {section.kind}
            </button>
            <span className="row-actions">
              <button
                type="button"
                className="btn-ghost"
                aria-label="Move up"
                onClick={() => onChange(moveSection(draft, section.id, -1))}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn-ghost"
                aria-label="Move down"
                onClick={() => onChange(moveSection(draft, section.id, 1))}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn-danger"
                aria-label="Remove section"
                onClick={() => {
                  if (
                    section.body.trim() &&
                    !confirm(`"${section.title}" has writing in it. Delete it?`)
                  ) {
                    return;
                  }
                  onChange(removeSection(draft, section.id));
                }}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>

      <div className="button-row">
        <button
          type="button"
          onClick={() => onChange(addSection(draft, "supporting"))}
        >
          Add supporting point
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => onChange(addSection(draft, "resulting"))}
        >
          Add resulting point
        </button>
        {draft.objectiveId && (
          <button type="button" className="btn-ghost" onClick={reset}>
            Reset to the objective's scaffold
          </button>
        )}
      </div>
    </Panel>
  );
};
