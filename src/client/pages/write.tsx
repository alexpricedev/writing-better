import { App } from "@client/write/app";
import { render } from "preact";

/**
 * Mounts the workspace over the server-rendered shell.
 *
 * The container is emptied first. `render` diffs against whatever is already
 * inside it, and the shell is a static pitch rather than a serialised copy of
 * this component tree — left in place, Preact appends the app below it and the
 * page ends up with two of everything.
 */
export function init() {
  const mount = document.getElementById("app");
  if (!mount) return;

  mount.textContent = "";
  render(<App />, mount);
}
