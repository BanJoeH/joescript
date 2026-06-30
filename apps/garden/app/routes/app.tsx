import { Outlet } from "react-router";

import { AppShell } from "~/components/app-shell";
import { getGardenEnv } from "~/lib/context.server";
import { isGardenAdmin } from "~/lib/admin";
import { requireGardenSession } from "~/lib/session.server";

import type { Route } from "./+types/app";

export async function loader({ request }: Route.LoaderArgs) {
  const { session } = await requireGardenSession(request, getGardenEnv());

  return {
    user: session.user,
    isAdmin: isGardenAdmin(session.user.email),
  };
}

export default function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
