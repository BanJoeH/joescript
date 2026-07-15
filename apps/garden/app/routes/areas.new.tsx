import { Link, redirect, useActionData } from "react-router";

import { AreaForm } from "~/components/areas/area-form";
import { QuickAddFlashBanner } from "~/components/quick-add-flash-banner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { getOptionalString, getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { filterSuggestedAreaNames } from "~/lib/onboarding";
import {
  areaCreateRedirectPath,
  parseAreaNewFlash,
  parseQuickAddFormKey,
  quickAddFlashMessage,
} from "~/lib/quick-add";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/areas.new";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Add area · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const url = new URL(request.url);
  const areas = await garden.areas.list();
  const flash = parseAreaNewFlash(url.searchParams);
  const formKey = parseQuickAddFormKey(url.searchParams);
  const suggestedNames = filterSuggestedAreaNames(areas.map((area) => area.name));

  return {
    householdId: params.householdId,
    flash,
    formKey,
    suggestedNames,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const intent = getOptionalString(formData, "intent") ?? "save";

  try {
    const area = await garden.areas.create({
      name: getString(formData, "name"),
    });
    if (!area) {
      return { error: "Could not create area." };
    }

    throw redirect(
      areaCreateRedirectPath(
        params.householdId,
        intent as "save" | "saveAndAddAnother" | "saveAndAddPlants",
        area.id,
      ),
    );
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "Could not create area.",
    };
  }
}

export default function NewArea({ loaderData }: Route.ComponentProps) {
  const { householdId, flash, formKey, suggestedNames } = loaderData;
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, "areas")}>
            Areas
          </Link>{" "}
          / Add area
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Add area</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick add</CardTitle>
          <CardDescription>
            Name a place in your garden. Pick a suggestion or type your own.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {flash ? <QuickAddFlashBanner message={quickAddFlashMessage(flash)} /> : null}
          <AreaForm
            key={formKey}
            cancelTo={householdPath(householdId, "areas")}
            error={actionData?.error}
            quickAdd
            submitLabel="Add area"
            suggestedNames={suggestedNames}
          />
        </CardContent>
      </Card>
    </div>
  );
}
