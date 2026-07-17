import { redirect, useActionData } from "react-router";
import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { PlantForm, toPlantFormValues } from "~/components/plants/plant-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { parsePlantUpdateFormData } from "~/lib/entity-forms.server";
import { getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/plants.$plantId.edit";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit plant · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const [plant, areas] = await Promise.all([
    garden.plants.get(params.plantId),
    garden.areas.list(),
  ]);

  if (!plant) {
    throw new Response("Plant not found", { status: 404 });
  }

  return {
    householdId: params.householdId,
    plant,
    areas,
    plantLookupEnabled: garden.plantLookup.isConfigured(),
    speciesSearchUrl: householdPath(params.householdId, "api/plants/search"),
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "delete") {
    const deleted = await garden.plants.remove(params.plantId);
    if (!deleted) {
      return { error: "Plant not found." };
    }
    throw redirect(householdPath(params.householdId, "plants"));
  }

  try {
    const data = parsePlantUpdateFormData(formData);
    const updated = await garden.plants.update(params.plantId, data);
    if (!updated) {
      return { error: "Plant not found." };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update plant.",
    };
  }

  throw redirect(householdPath(params.householdId, `plants/${params.plantId}`));
}

export default function EditPlant({ loaderData }: Route.ComponentProps) {
  const { householdId, plant, areas, plantLookupEnabled, speciesSearchUrl } = loaderData;
  const actionData = useActionData<typeof action>();

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
          / Edit
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Edit plant</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plant details</CardTitle>
          <CardDescription>Update how this plant appears in your garden.</CardDescription>
        </CardHeader>
        <CardContent>
          <PlantForm
            areas={areas}
            cancelTo={householdPath(householdId, `plants/${plant.id}`)}
            defaultValues={toPlantFormValues(plant)}
            error={actionData?.error}
            plantLookupEnabled={plantLookupEnabled}
            speciesSearchUrl={speciesSearchUrl}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete plant</CardTitle>
          <CardDescription>
            Removes this plant from your garden. Past journal entries are kept.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteForm confirmMessage={`Delete "${plant.name}"? This cannot be undone.`} />
        </CardContent>
      </Card>
    </div>
  );
}
