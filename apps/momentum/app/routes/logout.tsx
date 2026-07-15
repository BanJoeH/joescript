import { redirect } from "react-router";

import { createAuth } from "~/lib/auth.server";
import { getMomentumEnv } from "~/lib/context.server";

import type { Route } from "./+types/logout";

export async function action({ request }: Route.ActionArgs) {
  const auth = createAuth(getMomentumEnv());
  await auth.api.signOut({ headers: request.headers });
  throw redirect("/login");
}

export async function loader() {
  throw redirect("/login");
}
