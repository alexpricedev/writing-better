/**
 * Absolute URLs for links that leave the app.
 *
 * Built from `APP_URL`, never from the request. `new URL(req.url).host` is the
 * client's `Host` header, so a forged one would put an attacker's domain into a
 * link the app presented as its own. `APP_URL` is required and validated at
 * boot (`utils/env.ts`).
 */
export const appUrl = (path: string): string =>
  `${new URL(process.env.APP_URL as string).origin}${path}`;
