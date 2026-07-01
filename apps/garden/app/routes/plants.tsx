import { Link } from "react-router";

import {
  PhotoLightboxProvider,
  PhotoLightboxTrigger,
} from "~/components/journal/journal-photo-lightbox";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { householdPath, photoPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";
import type { PlantLatestPhoto } from "~/services/photos.service";

import type { Route } from "./+types/plants";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Plants · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const [plants, areas, latestPhotos] = await Promise.all([
    garden.plants.list(),
    garden.areas.list(),
    garden.photos.listLatestPerPlant(),
  ]);

  const latestPhotoByPlantId = Object.fromEntries(
    latestPhotos.map((photo) => [photo.plantId, photo]),
  ) as Record<string, PlantLatestPhoto>;

  return { householdId: params.householdId, plants, areas, latestPhotoByPlantId };
}

export default function Plants({ loaderData }: Route.ComponentProps) {
  const { householdId, plants, areas, latestPhotoByPlantId } = loaderData;
  const plantsByArea = areas.map((area) => ({
    area,
    plants: plants.filter((plant) => plant.areaId === area.id),
    latestPhotos: plants
      .filter((plant) => plant.areaId === area.id)
      .map((plant) => latestPhotoByPlantId[plant.id])
      .filter((photo): photo is PlantLatestPhoto => photo !== undefined),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Plants</h2>
          <p className="text-sm text-muted-foreground">
            Every plant in your garden, grouped by area.
          </p>
        </div>
        {areas.length > 0 ? (
          <Button asChild>
            <Link to={householdPath(householdId, "plants/new")}>Add plant</Link>
          </Button>
        ) : null}
      </div>

      {areas.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Create an{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              to={householdPath(householdId, "areas")}
            >
              area
            </Link>{" "}
            before adding plants.
          </CardContent>
        </Card>
      ) : plants.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No plants yet.{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              to={householdPath(householdId, "plants/new")}
            >
              Add the first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {plantsByArea.map(({ area, plants: areaPlants, latestPhotos }) =>
            areaPlants.length === 0 ? null : (
              <PhotoLightboxProvider householdId={householdId} key={area.id} photos={latestPhotos}>
                <section>
                  <h3 className="mb-3 text-lg font-medium">{area.name}</h3>
                  <ul className="space-y-2">
                    {areaPlants.map((plant) => {
                      const latestPhoto = latestPhotoByPlantId[plant.id];

                      return (
                        <li
                          key={plant.id}
                          className="flex items-center gap-3 rounded-md border px-4 py-3 hover:bg-accent/50"
                        >
                          {latestPhoto ? (
                            <PhotoLightboxTrigger
                              className="size-12 shrink-0 cursor-zoom-in overflow-hidden rounded-md border p-0"
                              photo={latestPhoto}
                            >
                              <img
                                alt=""
                                className="size-full object-cover"
                                loading="lazy"
                                src={photoPath(householdId, latestPhoto.id)}
                              />
                            </PhotoLightboxTrigger>
                          ) : (
                            <div
                              aria-hidden
                              className="size-12 shrink-0 rounded-md border bg-muted"
                            />
                          )}
                          <Link
                            className="min-w-0 flex-1"
                            to={householdPath(householdId, `plants/${plant.id}`)}
                          >
                            <span className="font-medium">{plant.name}</span>
                            {plant.latinName ? (
                              <span className="block text-sm italic text-muted-foreground">
                                {plant.latinName}
                                {plant.cultivar ? ` '${plant.cultivar}'` : ""}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </PhotoLightboxProvider>
            ),
          )}
        </div>
      )}
    </div>
  );
}
