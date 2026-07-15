import { redirect } from "react-router";

import { ACCESS_DENIED_CODE } from "~/lib/access.server";
import { createAuth } from "~/lib/auth.server";
import { getMomentumEnv } from "~/lib/context.server";

import type { Route } from "./+types/api.auth.$";

async function handleAuth({ request }: Route.LoaderArgs | Route.ActionArgs) {
  const auth = createAuth(getMomentumEnv());
  const response = await auth.handler(request);
  const url = new URL(request.url);

  if (!url.pathname.includes("/callback/")) {
    return response;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") || response.status < 400) {
    return response;
  }

  const body = (await response.clone().json()) as {
    code?: string;
    message?: string;
  };

  if (body.code === ACCESS_DENIED_CODE || body.message?.toLowerCase().includes("not authorized")) {
    throw redirect("/login?error=not_allowed");
  }

  return response;
}

export async function loader(args: Route.LoaderArgs) {
  return handleAuth(args);
}

export async function action(args: Route.ActionArgs) {
  return handleAuth(args);
}
