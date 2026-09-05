import { MOTIVATIONS, OBJECTIVES } from "../guide";
import type { Draft } from "../state";
import { canSeedOutline, seedOutline, toggleIn, update } from "../state";
import { Field, Panel } from "../ui";

interface Props {
  draft: Draft;
  onChange: (draft: Draft) => void;
}

/**
 * Objective and motivation, before a word is written.
 *
 * The objective isn't a label — it decides the outline, since the handbook
 * gives a different supporting/resulting skeleton for each one. The motivation
 * decides nothing structural and is asked anyway: a piece with no answer here
 * is the one that sits untouched for months.
 */
export const AimPanel = ({ draft, onChange }: Props) => {
  const chooseObjective = (id: string) => {
    if (id === draft.objectiveId) return;

    if (canSeedOutline(draft)) {
      onChange(seedOutline(draft, id));
      return;
    }

    // Sections already carry writing, so the scaffold stays where it is. The
    // objective still changes — it's what every prompt describes the piece as.
    onChange(update(draft, { objectiveId: id }));
  };

  const motivated = draft.motivations.length > 0;

  return (
    <Panel
      title="Aim"
      lede="What this piece accomplishes, and what will keep you writing it."
    >
      <Field label="Title" hint="A working title is fine. It'll change.">
        <input
          type="text"
          value={draft.title}
          onInput={(event) =>
            onChange(
              update(draft, {
                title: (event.target as HTMLInputElement).value,
              }),
            )
          }
        />
      </Field>

      <Field
        label="Who is this for?"
        hint="Goes into every feedback prompt, so the agent reads it as your reader would."
      >
        <input
          type="text"
          value={draft.audience}
          placeholder="Founders who've never hired before"
          onInput={(event) =>
            onChange(
              update(draft, {
                audience: (event.target as HTMLInputElement).value,
              }),
            )
          }
        />
      </Field>

      <h3>Objective</h3>
      <p className="text-tertiary">
        Choosing one lays down its outline. Switching later keeps whatever
        you've already written.
      </p>
      <ul className="option-list">
        {OBJECTIVES.map((objective) => (
          <li key={objective.id}>
            <label>
              <input
                type="radio"
                name="objective"
                checked={draft.objectiveId === objective.id}
                onChange={() => chooseObjective(objective.id)}
              />
              <span>{objective.label}</span>
            </label>
          </li>
        ))}
      </ul>

      <h3>Motivation</h3>
      <p className="text-tertiary">
        Tick every one that's true. None of them being true is the honest reason
        a draft stalls for months.
      </p>
      <ul className="checklist">
        {MOTIVATIONS.map((motivation) => (
          <li key={motivation.id}>
            <label>
              <input
                type="checkbox"
                checked={draft.motivations.includes(motivation.id)}
                onChange={() =>
                  onChange(
                    update(draft, {
                      motivations: toggleIn(draft.motivations, motivation.id),
                    }),
                  )
                }
              />
              <span>{motivation.label}</span>
            </label>
          </li>
        ))}
      </ul>

      {draft.objectiveId && !motivated && (
        <p className="warning">
          No motivation ticked. The handbook's diagnosis for a piece you keep
          putting off is that you weren't passionate enough about the topic —
          worth knowing now rather than in three weeks.
        </p>
      )}
    </Panel>
  );
};
