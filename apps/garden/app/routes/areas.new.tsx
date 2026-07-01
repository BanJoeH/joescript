import { Link, redirect, useActionData } from "react-router";

import { AreaForm } from "~/components/areas/area-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/areas.new";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Add area · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireGardenService(request, getGardenEnv(), params.householdId);

  return { householdId: params.householdId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();

  try {
    const area = await garden.areas.create({
      name: getString(formData, "name"),
    });
    if (!area) {
      return { error: "Could not create area." };
    }
    throw redirect(householdPath(params.householdId, "areas"));
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
  const { householdId } = loaderData;
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
          <CardTitle>Area details</CardTitle>
          <CardDescription>Areas group plants and journal entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaForm
            cancelTo={householdPath(householdId, "areas")}
            error={actionData?.error}
            submitLabel="Add area"
          />
        </CardContent>
      </Card>
    </div>
  );
}
