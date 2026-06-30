import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { journalEntryStatuses } from "~/db/schema";
import { formatDateInput, parseDateInput } from "~/lib/dates";
import { getGardenEnv } from "~/lib/context.server";
import { getOptionalString, getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/journal.new";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Add journal entry · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const url = new URL(request.url);
  const [plants, areas] = await Promise.all([garden.plants.list(), garden.areas.list()]);

  return {
    householdId: params.householdId,
    plants,
    areas,
    defaults: {
      plantId: url.searchParams.get("plantId") ?? "",
      areaId: url.searchParams.get("areaId") ?? "",
      careRuleId: url.searchParams.get("careRuleId") ?? "",
      taskType: url.searchParams.get("taskType") ?? "",
      status: url.searchParams.get("status") ?? "note",
      performedAt: formatDateInput(new Date()),
    },
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const performedAt = parseDateInput(getString(formData, "performedAt"));

  if (!performedAt) {
    return { error: "Enter a valid date." };
  }

  const status = getString(formData, "status");
  if (!journalEntryStatuses.includes(status as (typeof journalEntryStatuses)[number])) {
    return { error: "Choose a valid status." };
  }

  try {
    const entry = await garden.journal.create({
      plantId: getOptionalString(formData, "plantId"),
      areaId: getOptionalString(formData, "areaId"),
      careRuleId: getOptionalString(formData, "careRuleId"),
      taskType: getOptionalString(formData, "taskType"),
      status: status as (typeof journalEntryStatuses)[number],
      notes: getOptionalString(formData, "notes"),
      performedAt,
    });

    const plantId = entry?.plantId;
    throw redirect(
      plantId
        ? householdPath(params.householdId, `plants/${plantId}`)
        : householdPath(params.householdId, "journal"),
    );
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "Could not create journal entry.",
    };
  }
}

export default function NewJournalEntry() {
  const { householdId, plants, areas, defaults } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, "journal")}>
            Journal
          </Link>{" "}
          / Add entry
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Add journal entry</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>What happened?</CardTitle>
          <CardDescription>
            Log work done, things you noticed, or tasks you skipped.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form className="space-y-4" method="post">
            {actionData?.error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {actionData.error}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={defaults.status} id="status" name="status" required>
                  {journalEntryStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="performedAt">Date</Label>
                <Input
                  defaultValue={defaults.performedAt}
                  id="performedAt"
                  name="performedAt"
                  required
                  type="date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plantId">Plant</Label>
                <Select defaultValue={defaults.plantId} id="plantId" name="plantId">
                  <option value="">None</option>
                  {plants.map((plant) => (
                    <option key={plant.id} value={plant.id}>
                      {plant.name} ({plant.areaName})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="areaId">Area</Label>
                <Select defaultValue={defaults.areaId} id="areaId" name="areaId">
                  <option value="">None</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="taskType">Task type</Label>
                <Input
                  defaultValue={defaults.taskType}
                  id="taskType"
                  name="taskType"
                  placeholder="Fed lawn, coppiced dogwood, first rose flower"
                />
              </div>
            </div>

            {defaults.careRuleId ? (
              <input name="careRuleId" type="hidden" value={defaults.careRuleId} />
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="What did you do or notice?" rows={4} />
            </div>

            <div className="flex gap-3">
              <Button type="submit">Save entry</Button>
              <Button asChild variant="outline">
                <Link to={householdPath(householdId, "journal")}>Cancel</Link>
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
