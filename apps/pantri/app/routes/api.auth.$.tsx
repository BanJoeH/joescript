import { createAuth } from "~/lib/auth.server";
import { getPantriEnv } from "~/lib/context.server";

import type { Route } from "./+types/api.auth.$";

async function handleAuth({ request }: Route.LoaderArgs | Route.ActionArgs) {
  const auth = createAuth(getPantriEnv());
  return auth.handler(request);
}

export async function loader(args: Route.LoaderArgs) {
  return handleAuth(args);
}

export async function action(args: Route.ActionArgs) {
  return handleAuth(args);
}
