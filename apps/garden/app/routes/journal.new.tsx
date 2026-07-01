import { Link, redirect, useActionData, useLoaderData } from "react-router";
import { useId } from "react";

import { JournalEntryForm } from "~/components/journal/journal-entry-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { journalEntryStatuses } from "~/db/schema";
import { getGardenEnv } from "~/lib/context.server";
import { formatDateInput, parseDateInput } from "~/lib/dates";
import { parsePhotoUploads } from "~/lib/entity-forms.server";
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
      notes: "",
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

    if (!entry) {
      return { error: "Could not create journal entry." };
    }

    const uploads = parsePhotoUploads(formData);
    if (uploads.length > 0) {
      try {
        await garden.photos.upload(entry.id, uploads);
      } catch (uploadError) {
        return {
          error:
            uploadError instanceof Error
              ? `${uploadError.message} Entry was saved without photos — you can add them on edit.`
              : "Entry was saved, but photos could not be uploaded.",
        };
      }
    }

    const plantId = entry.plantId;
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
  const formId = useId();

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
          <JournalEntryForm
            areas={areas}
            cancelTo={householdPath(householdId, "journal")}
            defaultValues={defaults}
            error={actionData?.error}
            formId={formId}
            plants={plants}
            submitLabel="Save entry"
          />
        </CardContent>
      </Card>
    </div>
  );
}
