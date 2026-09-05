import { log } from "../services/logger";

const REQUIRED = ["PORT", "APP_NAME", "APP_URL"];

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    log.error("env", `Missing required variables: ${missing.join(", ")}`);
    log.error(
      "env",
      "Set these in your .env file or environment before starting the server",
    );
    process.exit(1);
  }

  // TRUST_PROXY decides whose word the rate limiter takes for the client
  // address (see middleware/client-ip.ts). A typo is worth refusing to boot
  // over: "ture" silently means "off", and off behind a proxy collapses every
  // client into one rate-limit bucket.
  if (
    process.env.TRUST_PROXY !== undefined &&
    !["true", "false"].includes(process.env.TRUST_PROXY)
  ) {
    log.error(
      "env",
      `TRUST_PROXY must be one of: true, false (got "${process.env.TRUST_PROXY}")`,
    );
    process.exit(1);
  }

  if (process.env.TRUST_PROXY === "true") {
    log.info(
      "env",
      "Trusting x-forwarded-for from the proxy for rate limiting",
    );
  }

  log.info("env", "Environment variables validated");
}
