import { Link, redirect, useActionData } from "react-router";

import { CareRuleForm } from "~/components/care-rules/care-rule-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { getCheckedMonths, getOptionalString, getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/plants.$plantId.care-rules.new";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Add care rule · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const plant = await garden.plants.get(params.plantId);

  if (!plant) {
    throw new Response("Plant not found", { status: 404 });
  }

  return { householdId: params.householdId, plant };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const months = getCheckedMonths(formData);

  if (months.length === 0) {
    return { error: "Select at least one month." };
  }

  try {
    await garden.careRules.create({
      plantId: params.plantId,
      taskType: getString(formData, "taskType"),
      months,
      instructions: getOptionalString(formData, "instructions"),
      source: getOptionalString(formData, "source"),
      confidence: getOptionalString(formData, "confidence"),
      active: formData.get("active") === "on",
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create care rule.",
    };
  }

  throw redirect(householdPath(params.householdId, `plants/${params.plantId}`));
}

export default function NewCareRule({ loaderData }: Route.ComponentProps) {
  const { householdId, plant } = loaderData;
  const actionData = useActionData<typeof action>();
  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, `plants/${plant.id}`)}>
            {plant.name}
          </Link>{" "}
          / Add care rule
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Add care rule</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Care rule</CardTitle>
          <CardDescription>
            Set a recurring task for this plant. It will appear on your dashboard in the months you
            choose.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CareRuleForm
            cancelTo={householdPath(householdId, `plants/${plant.id}`)}
            defaultValues={{
              taskType: "",
              months: [currentMonth],
              instructions: "",
              source: "",
              confidence: "",
              active: true,
            }}
            error={actionData?.error}
            submitLabel="Save care rule"
          />
        </CardContent>
      </Card>
    </div>
  );
}
