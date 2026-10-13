import { useEffect } from "react";
import { Outlet } from "react-router";
import { PantryLiveRevalidator } from "~/components/pantry-live-revalidator";
import { ShoppingOutboxDrain } from "~/components/shopping/shopping-outbox-drain";
import { getPantriEnv } from "~/lib/context.server";
import {
  type PantryLayoutLoaderData,
  readPantryLayoutSnapshot,
  writePantryLayoutSnapshot,
} from "~/lib/offline/layout-snapshot";
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

/**
 * Persist layout auth/pantry metadata so offline hard-refresh can hydrate without
 * hitting `requirePantriService` (network). Without this, SW-served HTML flashes
 * then Oops when the layout loader refetch fails.
 */
export async function clientLoader({
  params,
  serverLoader,
}: Route.ClientLoaderArgs): Promise<PantryLayoutLoaderData> {
  try {
    const data = await serverLoader();
    const layout: PantryLayoutLoaderData = {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        image: data.user.image,
        emailVerified: data.user.emailVerified,
        createdAt:
          data.user.createdAt instanceof Date ? data.user.createdAt : new Date(data.user.createdAt),
        updatedAt:
          data.user.updatedAt instanceof Date ? data.user.updatedAt : new Date(data.user.updatedAt),
      },
      pantryId: data.pantryId,
      pantryName: data.pantryName,
      pantries: data.pantries.map((pantry) => ({ id: pantry.id, name: pantry.name })),
    };
    try {
      await writePantryLayoutSnapshot(layout);
    } catch {
      // Keep serving loader data even if IDB write fails.
    }
    return layout;
  } catch (error) {
    const snapshot = await readPantryLayoutSnapshot(params.pantryId);
    if (snapshot) return snapshot;
    throw error;
  }
}
clientLoader.hydrate = true;

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
