import { Outlet } from "react-router";

import { PantryLiveRevalidator } from "~/components/pantry-live-revalidator";
import { getPantriEnv } from "~/lib/context.server";
import { requirePantriService } from "~/services";

import type { Route } from "./+types/pantry";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { session, pantryId, pantryName, userPantries } = await requirePantriService(
    request,
    getPantriEnv(),
    params.pantryId,
  );

  return {
    user: session.user,
    pantryId,
    pantryName,
    pantries: userPantries,
  };
}

export default function PantryLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <PantryLiveRevalidator pantryId={loaderData.pantryId} />
      <Outlet />
    </>
  );
}
