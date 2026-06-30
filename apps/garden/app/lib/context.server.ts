import { env } from "cloudflare:workers";

import { parseGardenEnv } from "~/lib/env.server";

export function getGardenEnv() {
  return parseGardenEnv(env);
}
