import { useEffect, useState } from "preact/hooks";
import { AimPanel } from "./panels/aim";
import { DraftPanel } from "./panels/draft";
import { IntroPanel } from "./panels/intro";
import { OutlinePanel } from "./panels/outline";
import { RewritePanel } from "./panels/rewrite";
import { ShipPanel } from "./panels/ship";
import type { Draft } from "./state";
import { averageScore, createDraft, wordCount } from "./state";
import { type Library, load, save } from "./storage";

const PANELS = [
  { id: "aim", label: "Aim" },
  { id: "intro", label: "Intro" },
  { id: "outline", label: "Outline" },
  { id: "draft", label: "Draft" },
  { id: "rewrite", label: "Rewrite" },
  { id: "ship", label: "Ship" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

const DraftSummary = ({ draft }: { draft: Draft }) => {
  const words = wordCount(draft);
  const average = averageScore(draft, "draft");
  return (
    <span className="draft-meta">
      {words} {words === 1 ? "word" : "words"}
      {average !== null && ` · ${average}/10`}
    </span>
  );
};

export const App = () => {
  // Lazy initialiser: reading storage during the first render keeps the app from
  // painting an empty library and then swapping it out a frame later.
  const [library, setLibrary] = useState<Library>(() => load());
  const [panel, setPanel] = useState<PanelId>("aim");
  const [storageFailed, setStorageFailed] = useState(false);

  useEffect(() => {
    setStorageFailed(!save(library));
  }, [library]);

  const active =
    library.drafts.find((draft) => draft.id === library.activeId) ?? null;

  const start = () => {
    const draft = createDraft();
    setLibrary({ drafts: [draft, ...library.drafts], activeId: draft.id });
    setPanel("aim");
  };

  const replace = (updated: Draft) => {
    setLibrary({
      ...library,
      drafts: library.drafts.map((draft) =>
        draft.id === updated.id ? updated : draft,
      ),
    });
  };

  const remove = (id: string) => {
    const draft = library.drafts.find((candidate) => candidate.id === id);
    if (!draft) return;

    // Nothing here is recoverable from a server, so deleting is final and says so.
    if (
      !confirm(
        `Delete "${draft.title || "Untitled"}"? It only exists in this browser, so this can't be undone.`,
      )
    ) {
      return;
    }

    const drafts = library.drafts.filter((candidate) => candidate.id !== id);
    setLibrary({
      drafts,
      activeId:
        library.activeId === id ? (drafts[0]?.id ?? null) : library.activeId,
    });
  };

  return (
    <div className="workspace">
      <aside className="library">
        <div className="library-head">
          <h2>Pieces</h2>
          <button type="button" onClick={start}>
            New
          </button>
        </div>

        {library.drafts.length === 0 ? (
          <p className="text-tertiary">
            Nothing here yet. Start with an idea you can't stop thinking about.
          </p>
        ) : (
          <ul className="draft-list">
            {library.drafts.map((draft) => (
              <li key={draft.id}>
                <button
                  type="button"
                  className={
                    draft.id === library.activeId
                      ? "draft-item active"
                      : "draft-item"
                  }
                  onClick={() => setLibrary({ ...library, activeId: draft.id })}
                >
                  <span className="draft-title">
                    {draft.title || "Untitled"}
                  </span>
                  <DraftSummary draft={draft} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="library-note text-quaternary">
          Everything you write stays in this browser. It's never sent anywhere —
          and never backed up. Export from Ship.
        </p>
      </aside>

      <main className="stage">
        {storageFailed && (
          <p className="warning" role="alert">
            This browser refused to save — storage may be full or blocked. Copy
            your work out before closing the tab.
          </p>
        )}

        {active ? (
          <>
            <div className="stage-bar">
              <nav className="panel-tabs" aria-label="Writing stages">
                {PANELS.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    className={entry.id === panel ? "active" : undefined}
                    aria-current={entry.id === panel ? "page" : undefined}
                    onClick={() => setPanel(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </nav>
              <button
                type="button"
                className="btn-danger stage-delete"
                onClick={() => remove(active.id)}
              >
                Delete piece
              </button>
            </div>

            {panel === "aim" && <AimPanel draft={active} onChange={replace} />}
            {panel === "intro" && (
              <IntroPanel draft={active} onChange={replace} />
            )}
            {panel === "outline" && (
              <OutlinePanel draft={active} onChange={replace} />
            )}
            {panel === "draft" && (
              <DraftPanel draft={active} onChange={replace} />
            )}
            {panel === "rewrite" && (
              <RewritePanel draft={active} onChange={replace} />
            )}
            {panel === "ship" && (
              <ShipPanel draft={active} onChange={replace} />
            )}
          </>
        ) : (
          <section className="empty-state">
            <h2>Write something worth reading</h2>
            <p className="lead">
              Six stages, from a nagging idea to a piece that earns its ending.
              The app holds the structure; you supply the obsession.
            </p>
            <button type="button" onClick={start}>
              Start a piece
            </button>
          </section>
        )}
      </main>
    </div>
  );
};
