import { Link, redirect, useActionData } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { JournalEntryForm } from "~/components/journal/journal-entry-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { journalEntryStatuses } from "~/db/schema";
import { formatDateInput } from "~/lib/dates";
import { parseJournalFormData } from "~/lib/entity-forms.server";
import { getGardenEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { householdPath } from "~/lib/household-path";
import { requireGardenService } from "~/services";

import type { Route } from "./+types/journal.$entryId.edit";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit journal entry · Garden" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const [entry, plants, areas] = await Promise.all([
    garden.journal.get(params.entryId),
    garden.plants.list(),
    garden.areas.list(),
  ]);

  if (!entry) {
    throw new Response("Journal entry not found", { status: 404 });
  }

  return { householdId: params.householdId, entry, plants, areas };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { garden } = await requireGardenService(request, getGardenEnv(), params.householdId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "delete") {
    const deleted = await garden.journal.remove(params.entryId);
    if (!deleted) {
      return { error: "Journal entry not found." };
    }
    throw redirect(householdPath(params.householdId, "journal"));
  }

  const data = parseJournalFormData(formData);
  if (!data.performedAt) {
    return { error: "Enter a valid date." };
  }

  if (!journalEntryStatuses.includes(data.status as (typeof journalEntryStatuses)[number])) {
    return { error: "Choose a valid status." };
  }

  try {
    const updated = await garden.journal.update(params.entryId, {
      plantId: data.plantId,
      areaId: data.areaId,
      careRuleId: data.careRuleId,
      taskType: data.taskType,
      status: data.status as (typeof journalEntryStatuses)[number],
      notes: data.notes,
      performedAt: data.performedAt,
    });
    if (!updated) {
      return { error: "Journal entry not found." };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update journal entry.",
    };
  }

  throw redirect(householdPath(params.householdId, "journal"));
}

export default function EditJournalEntry({ loaderData }: Route.ComponentProps) {
  const { householdId, entry, plants, areas } = loaderData;
  const actionData = useActionData<typeof action>();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={householdPath(householdId, "journal")}>
            Journal
          </Link>{" "}
          / Edit entry
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Edit journal entry</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entry details</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalEntryForm
            areas={areas}
            cancelTo={householdPath(householdId, "journal")}
            defaultValues={{
              status: entry.status,
              performedAt: formatDateInput(entry.performedAt),
              plantId: entry.plantId ?? "",
              areaId: entry.areaId ?? "",
              careRuleId: entry.careRuleId ?? "",
              taskType: entry.taskType ?? "",
              notes: entry.notes ?? "",
            }}
            error={actionData?.error}
            plants={plants}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete entry</CardTitle>
          <CardDescription>Removes this journal entry from your garden history.</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteForm confirmMessage="Delete this journal entry? This cannot be undone." />
        </CardContent>
      </Card>
    </div>
  );
}
