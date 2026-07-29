import { env } from "cloudflare:workers";

import { parsePantriEnv } from "~/lib/env.server";

export function getPantriEnv() {
  return parsePantriEnv(env);
}

export function getWorkerEnv() {
  return env;
}
