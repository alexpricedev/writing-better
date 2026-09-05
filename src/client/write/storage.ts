/**
 * localStorage is the whole database.
 *
 * Nothing here reaches the server, so every read has to survive the browser
 * saying no: a private window, cleared site data, a quota that filled up, or a
 * payload written by an older version of this app. A throw in any of those
 * cases would blank the page the writing lives in, so each one degrades to an
 * empty library instead, and the caller finds out whether a save actually
 * landed.
 */

import type { Draft } from "./state";

const KEY = "writing-better:library:v1";

export interface Library {
  drafts: Draft[];
  activeId: string | null;
}

export const EMPTY_LIBRARY: Library = { drafts: [], activeId: null };

/** Reading a Draft back from JSON, where every field is `unknown`. */
const isDraft = (value: unknown): value is Draft => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    Array.isArray(candidate.sections)
  );
};

export const load = (): Library => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // Storage blocked outright (some privacy modes throw on access).
    return EMPTY_LIBRARY;
  }

  if (!raw) return EMPTY_LIBRARY;

  try {
    const parsed = JSON.parse(raw) as Partial<Library>;
    const drafts = Array.isArray(parsed.drafts)
      ? parsed.drafts.filter(isDraft)
      : [];
    const activeId =
      typeof parsed.activeId === "string" &&
      drafts.some((draft) => draft.id === parsed.activeId)
        ? parsed.activeId
        : (drafts[0]?.id ?? null);

    return { drafts, activeId };
  } catch {
    // Corrupt payload. Better an empty library than a page that won't render;
    // the raw string stays in storage either way, so nothing is destroyed.
    return EMPTY_LIBRARY;
  }
};

/**
 * Returns whether the write landed. A full quota is the realistic failure, and
 * the writer needs to hear about it while the words are still on screen — not
 * on the next page load, when they're gone.
 */
export const save = (library: Library): boolean => {
  try {
    localStorage.setItem(KEY, JSON.stringify(library));
    return true;
  } catch {
    return false;
  }
};

/**
 * Copy to clipboard, with the pre-`navigator.clipboard` fallback.
 *
 * The clipboard is how every piece of human feedback leaves this app, so it
 * failing silently would break the one flow the app is built around.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or a non-secure context — fall through to the textarea.
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
};

/** Hand the writer a file. The browser holds the only other copy. */
export const download = (filename: string, contents: string): void => {
  const blob = new Blob([contents], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const filenameFor = (title: string): string => {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "draft";
  return `${slug}.md`;
};
