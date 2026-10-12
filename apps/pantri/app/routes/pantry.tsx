import { useEffect } from "react";
import { Outlet } from "react-router";
import { PantryLiveRevalidator } from "~/components/pantry-live-revalidator";
import { ShoppingOutboxDrain } from "~/components/shopping/shopping-outbox-drain";
import { getPantriEnv } from "~/lib/context.server";
import { prefetchShoppingOfflineShells } from "~/lib/offline/register-sw";
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
  useEffect(() => {
    prefetchShoppingOfflineShells(loaderData.pantryId);
  }, [loaderData.pantryId]);

  return (
    <>
      <PantryLiveRevalidator pantryId={loaderData.pantryId} userId={loaderData.user.id} />
      {/* Single drain for the whole pantry — avoids dual home/sorted drivers. */}
      <ShoppingOutboxDrain pantryId={loaderData.pantryId} />
      <Outlet />
    </>
  );
}
