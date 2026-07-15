import { env } from "cloudflare:workers";

import { parseMomentumEnv } from "~/lib/env.server";

export function getMomentumEnv() {
  return parseMomentumEnv(env);
}
