import { Outlet } from "react-router";

import { AppShell } from "~/components/app-shell";
import { getPantriEnv } from "~/lib/context.server";
import { requirePantriSession } from "~/lib/session.server";

import type { Route } from "./+types/app";

export async function loader({ request }: Route.LoaderArgs) {
  const { session } = await requirePantriSession(request, getPantriEnv());

  return {
    user: session.user,
  };
}

export default function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
