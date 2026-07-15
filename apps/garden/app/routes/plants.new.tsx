import { Link, redirect, useActionData } from "react-router";

import { PlantForm } from "~/components/plants/plant-form";
import { QuickAddFlashBanner } from "~/components/quick-add-flash-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { parsePlantCreateFormData } from "~/lib/entity-forms.server";
import { householdPath } from "~/lib/household-path";
import { resolveDuplicatePlantForm } from "~/lib/onboarding";
import {
  parsePlantNewFlash,
  parseQuickAddFormKey,
  plantCreateContinuePath,
  quickAddFlashMessage,
} from "~/lib/quick-add";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/plants.new";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: loaderData?.duplicateFromName ? "Duplicate plant · Garden" : "Add plant · Garden",
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const url = new URL(request.url);
  const areas = await garden.areas.list();
  const areaId = url.searchParams.get("areaId") ?? areas[0]?.id ?? "";
  const fromPlantId = url.searchParams.get("fromPlantId");
  const flash = parsePlantNewFlash(url.searchParams, areas, areaId);
  const formKey = parseQuickAddFormKey(url.searchParams, fromPlantId ?? "initial");

  let duplicateFromName: string | null = null;
  let defaultValues = {
    areaId,
    name: "",
    latinName: "",
    cultivar: "",
    notes: "",
    plantedAt: "",
    removedAt: "",
  };

  if (fromPlantId) {
    const source = await garden.plants.get(fromPlantId);
    if (!source) {
      throw new Response("Plant not found", { status: 404 });
    }

    duplicateFromName = source.name;
    defaultValues = resolveDuplicatePlantForm(source, areas, areaId).defaultValues;
  }

  return {
    householdId: params.householdId,
    areas,
    plantLookupEnabled: garden.plantLookup.isConfigured(),
    speciesSearchUrl: householdPath(params.householdId, "api/plants/search"),
    flash,
    duplicateFromName,
    formKey,
    defaultValues,
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

    throw redirect(plantCreateContinuePath(params.householdId, plant.areaId));
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
  const {
    householdId,
    areas,
    defaultValues,
    plantLookupEnabled,
    speciesSearchUrl,
    flash,
    duplicateFromName,
    formKey,
  } = loaderData;
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, "plants")}>
            Plants
          </Link>{" "}
          / {duplicateFromName ? "Duplicate plant" : "Add plant"}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {duplicateFromName ? "Duplicate plant" : "Add plant"}
        </h2>
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
            <CardTitle>{duplicateFromName ? "Duplicate" : "Quick add"}</CardTitle>
            <CardDescription>
              {duplicateFromName
                ? "Name and area are copied. Adjust either if needed."
                : "Give each plant a name and choose which area it lives in."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {duplicateFromName ? (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Copying &ldquo;{duplicateFromName}&rdquo;. Change the name if you want to tell
                plants apart.
              </p>
            ) : null}
            {flash ? <QuickAddFlashBanner message={quickAddFlashMessage(flash)} /> : null}
            <PlantForm
              key={formKey}
              areas={areas}
              cancelTo={householdPath(householdId, "plants")}
              defaultValues={defaultValues}
              error={actionData?.error}
              plantLookupEnabled={plantLookupEnabled}
              quickAdd
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
