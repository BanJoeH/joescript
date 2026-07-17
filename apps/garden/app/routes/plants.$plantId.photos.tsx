import { Link } from "~/components/link";
import { PlantPhotoGallery } from "~/components/plants/plant-photo-gallery";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/plants.$plantId.photos";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Plant photos · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const plant = await garden.plants.get(params.plantId);

  if (!plant) {
    throw new Response("Plant not found", { status: 404 });
  }

  const plantPhotos = await garden.photos.listForPlant(plant.id);

  return { householdId: params.householdId, plant, plantPhotos };
}

export default function PlantPhotos({ loaderData }: Route.ComponentProps) {
  const { householdId, plant, plantPhotos } = loaderData;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, "plants")}>
            Plants
          </Link>{" "}
          /{" "}
          <Link className="hover:underline" to={householdPath(householdId, `plants/${plant.id}`)}>
            {plant.name}
          </Link>{" "}
          / Photos
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Photos</h2>
        <p className="text-sm text-muted-foreground">{plant.name}</p>
      </div>

      {plantPhotos.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No photos yet.{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              to={`${householdPath(householdId, "journal/new")}?plantId=${plant.id}`}
            >
              Add a journal entry with photos
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All photos</CardTitle>
            <CardDescription>From journal entries for this plant, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlantPhotoGallery householdId={householdId} photos={plantPhotos} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
