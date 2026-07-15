import { Outlet } from "react-router";

import { AppShell } from "~/components/app-shell";
import { getMomentumEnv } from "~/lib/context.server";
import { requireMomentumSession } from "~/lib/session.server";

import type { Route } from "./+types/app";

export async function loader({ request }: Route.LoaderArgs) {
  await requireMomentumSession(request, getMomentumEnv());
  return null;
}

export default function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
