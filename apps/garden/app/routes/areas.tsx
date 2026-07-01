import { Link } from "react-router";

import { AreaList } from "~/components/areas/area-list";
import { AreaPlantPhotoStrip } from "~/components/areas/area-plant-photo-strip";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";
import type { PlantLatestPhoto } from "~/services/photos.service";

import type { Route } from "./+types/areas";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Areas · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const [areas, latestPhotos] = await Promise.all([
    garden.areas.list(),
    garden.photos.listLatestPerPlant(),
  ]);

  const latestPhotosByArea: Record<string, PlantLatestPhoto[]> = {};
  for (const photo of latestPhotos) {
    const existing = latestPhotosByArea[photo.areaId] ?? [];
    existing.push(photo);
    latestPhotosByArea[photo.areaId] = existing;
  }

  return { householdId: params.householdId, areas, latestPhotosByArea };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "reorder") {
    try {
      const order = JSON.parse(getString(formData, "order")) as string[];
      await garden.areas.reorder(order);
      return { ok: true as const };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not reorder areas.",
      };
    }
  }

  if (intent === "update") {
    try {
      const updated = await garden.areas.update(getString(formData, "id"), {
        name: getString(formData, "name"),
      });
      if (!updated) {
        return { error: "Area not found." };
      }
      return { updated: true as const };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not update area.",
      };
    }
  }

  if (intent === "delete") {
    try {
      const deleted = await garden.areas.remove(getString(formData, "id"));
      if (!deleted) {
        return { error: "Area not found." };
      }
      return { deleted: true as const };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not delete area.",
      };
    }
  }

  return { error: "Unknown action." };
}

export default function Areas({ loaderData }: Route.ComponentProps) {
  const { householdId, areas, latestPhotosByArea } = loaderData;
  const areasWithPhotos = areas.filter((area) => (latestPhotosByArea[area.id]?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Areas</h2>
          <p className="text-sm text-muted-foreground">
            Physical parts of the garden — patio, front border, veg patch.
          </p>
        </div>
        <Button asChild>
          <Link to={householdPath(householdId, "areas/new")}>Add area</Link>
        </Button>
      </div>

      {areas.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No areas yet.{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              to={householdPath(householdId, "areas/new")}
            >
              Add the first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Drag to reorder. Use the icons to edit or delete.
          </p>
          <AreaList areas={areas} />
        </div>
      )}

      {areasWithPhotos.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Latest photos</h3>
            <p className="text-sm text-muted-foreground">
              Most recent journal photo from each plant, grouped by area.
            </p>
          </div>
          {areasWithPhotos.map((area) => (
            <Card key={area.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{area.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <AreaPlantPhotoStrip
                  householdId={householdId}
                  photos={latestPhotosByArea[area.id] ?? []}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
