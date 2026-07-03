import { Link, redirect, useActionData } from "react-router";

import { PlantForm } from "~/components/plants/plant-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { parsePlantCreateFormData } from "~/lib/entity-forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/plants.new";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Add plant · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const url = new URL(request.url);
  const areas = await garden.areas.list();
  const areaId = url.searchParams.get("areaId") ?? areas[0]?.id ?? "";

  return {
    householdId: params.householdId,
    areas,
    plantLookupEnabled: garden.plantLookup.isConfigured(),
    speciesSearchUrl: householdPath(params.householdId, "api/plants/search"),
    defaultValues: {
      areaId,
      name: "",
      latinName: "",
      cultivar: "",
      notes: "",
      plantedAt: "",
      removedAt: "",
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();

  try {
    const plant = await garden.plants.create(parsePlantCreateFormData(formData));
    if (!plant) {
      return { error: "Could not create plant." };
    }
    throw redirect(householdPath(params.householdId, `plants/${plant.id}`));
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "Could not create plant.",
    };
  }
}

export default function NewPlant({ loaderData }: Route.ComponentProps) {
  const { householdId, areas, defaultValues, plantLookupEnabled, speciesSearchUrl } = loaderData;
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, "plants")}>
            Plants
          </Link>{" "}
          / Add plant
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Add plant</h2>
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plant details</CardTitle>
            <CardDescription>Name the plant as you think of it in the garden.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlantForm
              areas={areas}
              cancelTo={householdPath(householdId, "plants")}
              defaultValues={defaultValues}
              error={actionData?.error}
              plantLookupEnabled={plantLookupEnabled}
              showRemovedAt={false}
              speciesSearchUrl={speciesSearchUrl}
              submitLabel="Add plant"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
