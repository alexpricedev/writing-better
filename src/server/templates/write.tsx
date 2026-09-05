import { Layout } from "@server/components/layouts";
import { SITE_DESCRIPTION, SITE_NAME } from "@server/services/seo";

/**
 * The whole app is one page.
 *
 * The server renders the shell and the pitch; `src/client/write/` mounts the
 * workspace into `#app` and takes over. Everything below that mount point is
 * the fallback a visitor sees before the bundle runs — or if it never does —
 * so it says what the app is rather than showing an empty frame.
 */
export const Write = () => (
  <Layout
    title={`${SITE_NAME} — a writing companion`}
    description={SITE_DESCRIPTION}
    canonicalPath="/"
    name="write"
  >
    <div id="app">
      <section className="empty-state">
        <h1>{SITE_NAME}</h1>
        <p className="lead">
          A companion for writing nonfiction worth reading, built on Julian
          Shapiro's handbook: choose an objective, hook before you draft, then
          rewrite for clarity, succinctness and intrigue.
        </p>
        <p className="text-tertiary">
          Everything you write stays in your browser. Loading the workspace…
        </p>
      </section>
    </div>
  </Layout>
);
