#!/usr/bin/env bun

/**
 * Per-workspace port provisioning.
 *
 * Conductor gives every workspace its own git worktree, but the setup script
 * copies one `.env` into all of them — so every agent would run its dev server
 * on the same port and the second one fails to listen.
 *
 * `provision` rewrites this workspace's `.env` to the port Conductor allocated
 * it, and is safe to re-run: Conductor can re-run setup on an existing
 * workspace.
 *
 * Cloud workspaces get nothing: `CONDUCTOR_PORT` is unset there and the sandbox
 * has one checkout, so there is nothing to collide with.
 */

// The script imports nothing, so TypeScript would read it as a global script
// and reject the top-level await at the bottom. This marks it as a module.
export {};

const DEV_ENV = ".env";

const readEnv = async (path: string): Promise<string> => {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(
      `${path} not found — the Conductor setup script copies it from the repository root before this runs`,
    );
  }
  return file.text();
};

/**
 * Replace `key`'s value in place, keeping the comment that explains it. Only an
 * uncommented assignment is rewritten; if there is none the variable is
 * appended, so a fork that deleted the line still gets a working file.
 */
const setEnvValue = (text: string, key: string, value: string): string => {
  const line = new RegExp(`^${key}=.*$`, "m");
  if (line.test(text)) return text.replace(line, `${key}=${value}`);
  return `${text.replace(/\n*$/, "\n")}${key}=${value}\n`;
};

async function provision(): Promise<void> {
  const workspace = process.env.CONDUCTOR_WORKSPACE_NAME;
  const port = process.env.CONDUCTOR_PORT;

  if (!(workspace && port)) {
    console.log(
      "workspace: CONDUCTOR_WORKSPACE_NAME or CONDUCTOR_PORT is unset — leaving .env as copied.",
    );
    console.log(
      "workspace: expected in cloud workspaces, which have one checkout and nothing to collide with.",
    );
    return;
  }

  let dev = await readEnv(DEV_ENV);
  dev = setEnvValue(dev, "PORT", port);
  // APP_URL must carry the port: it is the origin every absolute link is built
  // from, and a mismatch would point those links at another workspace.
  dev = setEnvValue(dev, "APP_URL", `http://localhost:${port}`);
  await Bun.write(DEV_ENV, dev);

  console.log(`workspace: provisioning "${workspace}"`);
  console.log(`  port ${port} — dev server, APP_URL http://localhost:${port}`);
}

const command = process.argv[2];

try {
  if (command === "provision") {
    await provision();
  } else {
    console.error("Usage: bun run scripts/workspace.ts provision");
    process.exit(1);
  }
} catch (error) {
  console.error(
    `workspace: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
}
