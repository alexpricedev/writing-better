import { DONE_CHECKLIST, FEEDBACK_RULES, TARGETS } from "../guide";
import { readability } from "../lint";
import { PROMPTS } from "../prompts";
import type { Draft } from "../state";
import {
  averageScore,
  isReadyToShip,
  removeScore,
  toggleIn,
  toMarkdown,
  update,
  wordCount,
} from "../state";
import { copyToClipboard, download, filenameFor } from "../storage";
import { Checklist, CopyPrompt, Panel, RecordReply, Rules } from "../ui";

interface Props {
  draft: Draft;
  onChange: (draft: Draft) => void;
}

const finalPrompt = PROMPTS.find((prompt) => prompt.id === "final-read");

/**
 * The finish line, and the way out of the browser.
 *
 * Export is not a nicety here. Nothing in this app reaches a server, so a
 * cleared cache is the end of the piece — the download is the only copy that
 * outlives the browser it was written in.
 */
export const ShipPanel = ({ draft, onChange }: Props) => {
  const average = averageScore(draft, "draft");
  const scores = draft.scores.filter((score) => score.stage === "draft");
  const markdown = toMarkdown(draft);
  const stats = readability(markdown);
  const ready = isReadyToShip(draft);
  // Flesch-Kincaid on a title and two sentences is noise — one long word moves
  // it by a grade. Wait until there's enough text for the average to mean
  // something before putting a warning on screen.
  const gradeIsMeaningful = stats.words >= 150;

  return (
    <Panel title="Ship" lede="Scored, checked, and out of the browser.">
      <div className="stat-row">
        <div>
          <strong>{wordCount(draft)}</strong>
          <span className="text-tertiary">words</span>
        </div>
        <div>
          <strong>{average ?? "—"}</strong>
          <span className="text-tertiary">avg score of {scores.length}</span>
        </div>
        <div>
          <strong>{stats.grade || "—"}</strong>
          <span className="text-tertiary">reading grade</span>
        </div>
      </div>

      {gradeIsMeaningful && stats.grade > 8 && (
        <p className="warning">
          Grade {stats.grade} reads above a thirteen-year-old. That's a proxy,
          not a verdict — but it's usually long sentences, and long sentences
          make readers hold more in their head at once.
        </p>
      )}

      {finalPrompt && <CopyPrompt template={finalPrompt} draft={draft} />}
      <RecordReply draft={draft} onChange={onChange} stage="draft" />

      {scores.length > 0 && (
        <ul className="score-list">
          {scores.map((score) => (
            <li key={score.id}>
              <span className="score-value">{score.value}</span>
              <span className="score-note">{score.note.slice(0, 400)}</span>
              <button
                type="button"
                className="btn-danger"
                aria-label="Remove score"
                onClick={() => onChange(removeScore(draft, score.id))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <p
        className={
          average !== null && average >= TARGETS.draft ? "success" : "warning"
        }
      >
        {average === null
          ? `No reads yet. The gate is an average of ${TARGETS.draft} across a handful of readers.`
          : average >= TARGETS.draft
            ? `Averaging ${average}. That's the "this was a good read" bracket — don't chase 9+, it produces a bloated piece that satisfies no one.`
            : `Averaging ${average}, short of ${TARGETS.draft}. Rewrite, rest, read again.`}
      </p>

      <Rules
        title="What to do with feedback you disagree with"
        items={FEEDBACK_RULES}
      />

      <h3>Done means</h3>
      <Checklist
        items={DONE_CHECKLIST}
        checked={draft.done}
        onToggle={(id) =>
          onChange(update(draft, { done: toggleIn(draft.done, id) }))
        }
      />

      {ready && (
        <p className="success">
          Done by the handbook's definition. Publish it, then leave the next one
          alone for a while — nobody generates insight on a schedule.
        </p>
      )}

      <h3>Export</h3>
      <p className="text-tertiary">
        This piece lives in this browser and nowhere else. Clearing site data
        deletes it.
      </p>
      <div className="button-row">
        <button
          type="button"
          onClick={() => download(filenameFor(draft.title), markdown)}
        >
          Download markdown
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => void copyToClipboard(markdown)}
        >
          Copy markdown
        </button>
      </div>
    </Panel>
  );
};
