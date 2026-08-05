import type { ShouldRevalidateFunctionArgs } from "react-router";
import { Outlet } from "react-router";
import { OptimisticRevalidationFlush } from "~/components/optimistic-revalidation-flush";
import { PantryLiveRevalidator } from "~/components/pantry-live-revalidator";
import { getPantriEnv } from "~/lib/context.server";
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

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  return shouldRevalidatePantryRoutes(args);
}

export default function PantryLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <PantryLiveRevalidator pantryId={loaderData.pantryId} userId={loaderData.user.id} />
      <OptimisticRevalidationFlush />
      <Outlet />
    </>
  );
}
