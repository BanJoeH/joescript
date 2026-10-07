import { useEffect } from "react";
import type { ShouldRevalidateFunctionArgs } from "react-router";
import { Outlet } from "react-router";
import { OfflineBanner } from "~/components/offline-banner";
import { OptimisticRevalidationFlush } from "~/components/optimistic-revalidation-flush";
import { OutboxDrain } from "~/components/outbox-drain";
import { PantryLiveRevalidator } from "~/components/pantry-live-revalidator";
import { getPantriEnv } from "~/lib/context.server";
import { loadWithOfflineFallback } from "~/lib/offline/client-loader";
import { useOnlineStatus } from "~/lib/offline/connectivity";
import { prefetchPantryOfflineShells } from "~/lib/offline/register-sw";
import { getPantryLayoutSnapshot, savePantryLayoutSnapshot } from "~/lib/offline/snapshot";
import { shouldRevalidatePantryRoutes } from "~/lib/pantry-revalidate";
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

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  return loadWithOfflineFallback({
    serverLoader,
    readSnapshot: () => getPantryLayoutSnapshot(params.pantryId),
    writeSnapshot: async (data) => {
      await savePantryLayoutSnapshot({
        pantryId: data.pantryId,
        user: data.user,
        pantryName: data.pantryName,
        pantries: data.pantries.map((pantry) => ({ id: pantry.id, name: pantry.name })),
      });
    },
  });
}

clientLoader.hydrate = true as const;

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  return shouldRevalidatePantryRoutes(args);
}

export default function PantryLayout({ loaderData }: Route.ComponentProps) {
  const online = useOnlineStatus();

  useEffect(() => {
    if (!online) return;
    prefetchPantryOfflineShells(loaderData.pantryId);
  }, [loaderData.pantryId, online]);

  return (
    <>
      <OfflineBanner />
      <PantryLiveRevalidator pantryId={loaderData.pantryId} userId={loaderData.user.id} />
      <OutboxDrain />
      <OptimisticRevalidationFlush />
      <Outlet />
    </>
  );
}
