import { Link, redirect, useActionData } from "react-router";

import { CareRuleForm } from "~/components/care-rules/care-rule-form";
import { DeleteForm } from "~/components/delete-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { getGardenEnv } from "~/lib/context.server";
import { parseCareRuleMonths } from "~/lib/care-rules";
import { getCheckedMonths, getOptionalString, getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/plants.$plantId.care-rules.$careRuleId.edit";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit care rule · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const [plant, careRule] = await Promise.all([
    garden.plants.get(params.plantId),
    garden.careRules.get(params.careRuleId),
  ]);

  if (!plant) {
    throw new Response("Plant not found", { status: 404 });
  }

  if (!careRule || careRule.plantId !== plant.id) {
    throw new Response("Care rule not found", { status: 404 });
  }

  return { householdId: params.householdId, plant, careRule };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "delete") {
    const deleted = await garden.careRules.remove(params.careRuleId);
    if (!deleted) {
      return { error: "Care rule not found." };
    }
    throw redirect(householdPath(params.householdId, `plants/${params.plantId}`));
  }

  const months = getCheckedMonths(formData);
  if (months.length === 0) {
    return { error: "Select at least one month." };
  }

  try {
    const updated = await garden.careRules.update(params.careRuleId, {
      taskType: getString(formData, "taskType"),
      months,
      instructions: getOptionalString(formData, "instructions"),
      source: getOptionalString(formData, "source"),
      confidence: getOptionalString(formData, "confidence"),
      active: formData.get("active") === "on",
    });
    if (!updated) {
      return { error: "Care rule not found." };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update care rule.",
    };
  }

  throw redirect(householdPath(params.householdId, `plants/${params.plantId}`));
}

export default function EditCareRule({ loaderData }: Route.ComponentProps) {
  const { householdId, plant, careRule } = loaderData;
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, `plants/${plant.id}`)}>
            {plant.name}
          </Link>{" "}
          / Edit care rule
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Edit care rule</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>When to remind</CardTitle>
        </CardHeader>
        <CardContent>
          <CareRuleForm
            cancelTo={householdPath(householdId, `plants/${plant.id}`)}
            defaultValues={{
              taskType: careRule.taskType,
              months: parseCareRuleMonths(careRule.monthsJson),
              instructions: careRule.instructions ?? "",
              source: careRule.source ?? "",
              confidence: careRule.confidence ?? "",
              active: careRule.active,
            }}
            error={actionData?.error}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete care rule</CardTitle>
          <CardDescription>Removes this reminder from future dashboard jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteForm confirmMessage={`Delete the "${careRule.taskType}" care rule?`} />
        </CardContent>
      </Card>
    </div>
  );
}
